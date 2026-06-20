import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video as VideoIcon, Mic, MicOff, VideoOff, PhoneOff, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

type CallState = 'idle' | 'calling' | 'ringing' | 'connected';

export default function CallOverlay() {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>('idle');
  const [callerInfo, setCallerInfo] = useState<{ id: string; name: string; avatar?: string; isVideo: boolean; room: string } | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeRoomChannelRef = useRef<any>(null);

  // ==========================================
  // 🔔 1. AUDIO RINGTONES CONTROLLER
  // ==========================================
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // تحميل الأصوات في الخلفية وجعلها تتكرر (Loop)
    incomingAudioRef.current = new Audio("/sounds/ringtone.mp3");
    incomingAudioRef.current.loop = true;

    outgoingAudioRef.current = new Audio("/sounds/calling.mp3");
    outgoingAudioRef.current.loop = true;
  }, []);

  // تشغيل وإيقاف الرنة حسب الـ CallState
  useEffect(() => {
    const incAudio = incomingAudioRef.current;
    const outAudio = outgoingAudioRef.current;
    if (!incAudio || !outAudio) return;

    if (callState === 'ringing') {
      incAudio.currentTime = 0;
      incAudio.play().catch(() => console.log("Autoplay blocked by browser"));
    } else if (callState === 'calling') {
      outAudio.currentTime = 0;
      outAudio.play().catch(() => console.log("Autoplay blocked by browser"));
    } else {
      // في حالة idle أو connected نفصل الصوتين فوراً
      incAudio.pause();
      outAudio.pause();
    }
  }, [callState]);


  // --- 2. PAGER CHANNEL ---
  useEffect(() => {
    if (!user?.id) return;

    const pager = supabase.channel(`pager_${user.id}`);

    pager.on('broadcast', { event: 'INCOMING_RING' }, ({ payload }) => {
      if (callState !== 'idle') {
        const busyChan = supabase.channel(`pager_${payload.callerId}`);
        busyChan.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            busyChan.send({ type: 'broadcast', event: 'CALL_BUSY', payload: {} });
            supabase.removeChannel(busyChan);
          }
        });
        return;
      }

      setCallerInfo({
        id: payload.callerId,
        name: payload.callerName,
        avatar: payload.callerAvatar,
        isVideo: payload.isVideo,
        room: payload.roomName,
      });
      setCallState('ringing');
    });

    pager.on('broadcast', { event: 'CALL_BUSY' }, () => {
      alert("الطرف الآخر مشغول حالياً");
      endCall();
    });

    pager.subscribe();

    const handleStartCallEvent = (e: any) => {
      const { receiverId, receiverName, isVideo } = e.detail;
      initiateCall(receiverId, receiverName, isVideo);
    };

    window.addEventListener('START_WEBRTC_CALL' as any, handleStartCallEvent);

    return () => {
      supabase.removeChannel(pager);
      window.removeEventListener('START_WEBRTC_CALL' as any, handleStartCallEvent);
    };
  }, [user?.id, callState]);

  // --- 3. INITIATE CALL ---
  const initiateCall = async (targetId: string, targetName: string, isVideo: boolean) => {
    if (!user) return;
    const roomName = `webrtc_room_${user.id}_${targetId}`;

    setCallerInfo({ id: targetId, name: targetName, isVideo, room: roomName });
    setCallState('calling');

    const stream = await openMedia(isVideo);
    if (!stream) return endCallLocal();

    const callRoom = supabase.channel(roomName);
    activeRoomChannelRef.current = callRoom;

    setupWebRTCEvents(callRoom, stream, true);

    callRoom.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const targetPager = supabase.channel(`pager_${targetId}`);
        targetPager.subscribe((pagerStatus) => {
          if (pagerStatus === 'SUBSCRIBED') {
            targetPager.send({
              type: 'broadcast',
              event: 'INCOMING_RING',
              payload: {
                callerId: user.id,
                callerName: user.user_metadata?.full_name || user.email?.split('@')[0],
                isVideo,
                roomName,
              },
            });
            supabase.removeChannel(targetPager);
          }
        });
      }
    });
  };

  // --- 4. ACCEPT CALL ---
  const acceptCall = async () => {
    if (!callerInfo) return;

    const stream = await openMedia(callerInfo.isVideo);
    if (!stream) return endCallLocal();

    const callRoom = supabase.channel(callerInfo.room);
    activeRoomChannelRef.current = callRoom;

    setupWebRTCEvents(callRoom, stream, false);

    callRoom.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setCallState('connected');
        callRoom.send({ type: 'broadcast', event: 'PEER_JOINED', payload: {} });
      }
    });
  };

  // --- 5. WEBRTC ROOM LOGIC ---
  const setupWebRTCEvents = (room: any, stream: MediaStream, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        room.send({ type: 'broadcast', event: 'ICE_CANDIDATE', payload: { candidate: event.candidate } });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    room.on('broadcast', { event: 'PEER_JOINED' }, async () => {
      setCallState('connected');
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        room.send({ type: 'broadcast', event: 'SDP_OFFER', payload: { sdp: offer } });
      }
    });

    room.on('broadcast', { event: 'SDP_OFFER' }, async ({ payload }: any) => {
      if (!isInitiator) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        room.send({ type: 'broadcast', event: 'SDP_ANSWER', payload: { sdp: answer } });
      }
    });

    room.on('broadcast', { event: 'SDP_ANSWER' }, async ({ payload }: any) => {
      if (isInitiator) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });

    room.on('broadcast', { event: 'ICE_CANDIDATE' }, async ({ payload }: any) => {
      if (payload.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
      }
    });

    room.on('broadcast', { event: 'HANG_UP' }, () => {
      endCallLocal();
    });
  };

  const openMedia = async (video: boolean) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { width: 1280, height: 720 } : false });
      localStreamRef.current = s;
      if (localVideoRef.current) localVideoRef.current.srcObject = s;
      return s;
    } catch (e) {
      alert("تأكد من السماح للمتصفح باستخدام الكاميرا والمايكروفون");
      return null;
    }
  };

  const rejectCall = () => {
    if (callerInfo) {
      const room = supabase.channel(callerInfo.room);
      room.subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          room.send({ type: 'broadcast', event: 'HANG_UP', payload: {} });
          supabase.removeChannel(room);
        }
      });
    }
    endCallLocal();
  };

  const endCall = () => {
    if (activeRoomChannelRef.current) {
      activeRoomChannelRef.current.send({ type: 'broadcast', event: 'HANG_UP', payload: {} });
    }
    endCallLocal();
  };

  const endCallLocal = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (activeRoomChannelRef.current) supabase.removeChannel(activeRoomChannelRef.current);
    activeRoomChannelRef.current = null;
    setCallState('idle');
    setCallerInfo(null);
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  if (callState === 'idle') return null;

  return (
    <AnimatePresence>
      {/* 1. شاشة الرنين عند المستقبل */}
      {callState === 'ringing' && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed top-6 right-6 z-[99999] w-80 bg-slate-900/95 text-white p-5 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-12 h-12 border-2 border-indigo-500"><AvatarImage src={callerInfo?.avatar} /><AvatarFallback>👤</AvatarFallback></Avatar>
            <div>
              <h4 className="font-bold text-sm">{callerInfo?.name}</h4>
              <p className="text-xs text-indigo-400 animate-pulse">{callerInfo?.isVideo ? '🎥 مكالمة فيديو...' : '📞 مكالمة صوتية...'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={acceptCall} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold gap-1"><Check className="w-4 h-4" /> رد</Button>
            <Button onClick={rejectCall} variant="destructive" className="flex-1 font-bold gap-1"><X className="w-4 h-4" /> رفض</Button>
          </div>
        </motion.div>
      )}

      {/* 2. شاشة المكالمة المفتوحة */}
      {(callState === 'calling' || callState === 'connected') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center">
          
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {callerInfo?.isVideo ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover feed-remote" />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-32 h-32 border-4 border-indigo-500 shadow-2xl animate-pulse"><AvatarImage src={callerInfo?.avatar} /><AvatarFallback className="text-4xl">👤</AvatarFallback></Avatar>
                <h2 className="text-3xl font-bold text-white">{callerInfo?.name}</h2>
                <p className="text-sm text-indigo-400">{callState === 'calling' ? 'جاري الاتصال...' : 'متصل 🟢'}</p>
              </div>
            )}

            {callerInfo?.isVideo && (
              <div className="absolute bottom-24 right-6 w-32 md:w-48 aspect-video bg-zinc-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                {isCamOff && <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center"><VideoOff className="w-6 h-6 text-red-500" /></div>}
              </div>
            )}

            {callState === 'calling' && callerInfo?.isVideo && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                <p className="text-white font-bold">جاري الاتصال بـ {callerInfo?.name}...</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 flex items-center gap-4 bg-zinc-900/80 px-8 py-4 rounded-full backdrop-blur-2xl border border-white/10">
            <Button onClick={toggleMic} variant={isMuted ? 'destructive' : 'secondary'} size="icon" className="rounded-full w-12 h-12">
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            {callerInfo?.isVideo && (
              <Button onClick={toggleCam} variant={isCamOff ? 'destructive' : 'secondary'} size="icon" className="rounded-full w-12 h-12">
                {isCamOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
              </Button>
            )}
            <Button onClick={endCall} variant="destructive" size="icon" className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-700">
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}