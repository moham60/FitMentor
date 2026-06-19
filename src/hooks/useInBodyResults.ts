import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { InBodyResult } from "@/interfaces/inbody";

const isSystemDefaultResult = (result: InBodyResult) => result.raw_path === "system_default";

export function useInBodyResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<InBodyResult[]>([]);
  const [latestResult, setLatestResult] = useState<InBodyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        setResults([]);
        setLatestResult(null);
        setLoading(false);
        fetchedRef.current = false;
        return;
      }

      // Skip if already fetched for this user
      if (fetchedRef.current) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch InBody results from the table
        const { data, error: fetchError } = await supabase
          .from("inbody_results")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (fetchError) {
          console.error("[useInBodyResults] Fetch error:", fetchError);
          setError(fetchError.message);
          setResults([]);
          setLatestResult(null);
        } else {
          const typedResults = (data || []) as InBodyResult[];
          const userResults = typedResults.filter((result) => !isSystemDefaultResult(result));
          setResults(userResults);
          setLatestResult(userResults.length > 0 ? userResults[0] : null);
          fetchedRef.current = true;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[useInBodyResults] Error:", message);
        setError(message);
        setResults([]);
        setLatestResult(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user?.id]);

  const refetch = async () => {
    if (!user?.id) return;
    setLoading(true);
    fetchedRef.current = false;

    try {
      const { data, error: fetchError } = await supabase
        .from("inbody_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const typedResults = (data || []) as InBodyResult[];
        const userResults = typedResults.filter((result) => !isSystemDefaultResult(result));
        setResults(userResults);
        setLatestResult(userResults.length > 0 ? userResults[0] : null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    results,
    latestResult,
    loading,
    error,
    refetch,
  };
}
