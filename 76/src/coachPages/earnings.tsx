import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

import {
  MdSavings,
  MdAccountBalanceWallet,
  MdPayments,
} from "react-icons/md";
import { FaMoneyBillWave } from "react-icons/fa";
import MainLayout from "@/components/layout/MainLayout";

const chartData = [
  { month: "Aug", revenue: 3200 },
  { month: "Sep", revenue: 4100 },
  { month: "Oct", revenue: 5200 },
  { month: "Nov", revenue: 6100 },
  { month: "Dec", revenue: 7200 },
];

export default function Earnings() {
  return (
    <MainLayout title="Earnings">
      {/* ====== Top Cards ====== */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              Available Balance
            </CardTitle>
            <MdAccountBalanceWallet className="text-xl text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$4,120</p>
            <p className="text-xs text-muted-foreground">
              Ready to withdraw
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              This Month
            </CardTitle>
            <FaMoneyBillWave className="text-xl text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$7,200</p>
            <Badge variant="secondary">+18%</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              Lifetime Earnings
            </CardTitle>
            <MdSavings className="text-xl text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$68,420</p>
          </CardContent>
        </Card>
      </div>

      {/* ====== Charts & Withdraw ====== */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Charts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Earnings Overview</CardTitle>
            <Select defaultValue="6m">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="line">
              <TabsList>
                <TabsTrigger value="line">Trend</TabsTrigger>
                <TabsTrigger value="bar">Monthly</TabsTrigger>
              </TabsList>

              <TabsContent value="line" className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="bar" className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Withdraw Card */}
        <Card>
          <CardHeader>
            <CardTitle>Withdraw Earnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Available balance
              </p>
              <p className="text-2xl font-bold">$4,120</p>
            </div>

            <Select defaultValue="bank">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">
                  Bank Transfer
                </SelectItem>
                <SelectItem value="wallet">
                  Digital Wallet
                </SelectItem>
                <SelectItem value="card">
                  Debit Card
                </SelectItem>
              </SelectContent>
            </Select>

            <Button className="w-full">
              <MdPayments className="mr-2 text-lg" />
              Withdraw Now
            </Button>

            <p className="text-xs text-muted-foreground">
              Processing time depends on withdrawal method
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
