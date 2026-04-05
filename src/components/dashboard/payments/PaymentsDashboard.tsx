import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface Payment {
  id: string;
  amount: number;
  status: string;
  created: string;
}

interface PaymentsDashboardProps {
  payments: Payment[];
  formatCurrency: (amount: number) => string;
}

export function PaymentsDashboard({ payments, formatCurrency }: PaymentsDashboardProps) {
  const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([]);

  useEffect(() => {
    calculateMonthlyData();
  }, [payments]);

  const calculateMonthlyData = () => {
    const monthMap: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("pt-BR", { month: "short" });
      monthMap[key] = 0;
    }

    // Sum payments by month
    payments
      .filter((p) => p.status === "succeeded" || p.status === "paid")
      .forEach((p) => {
        const date = new Date(p.created);
        const key = date.toLocaleDateString("pt-BR", { month: "short" });
        if (monthMap[key] !== undefined) {
          monthMap[key] += p.amount;
        }
      });

    setMonthlyData(
      Object.entries(monthMap).map(([month, total]) => ({ month, total }))
    );
  };

  const totalReceived = payments
    .filter((p) => p.status === "succeeded" || p.status === "paid")
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPending = payments
    .filter((p) => ["processing", "requires_action", "requires_payment_method"].includes(p.status))
    .reduce((acc, p) => acc + p.amount, 0);

  const totalFailed = payments
    .filter((p) => ["canceled", "failed"].includes(p.status))
    .reduce((acc, p) => acc + p.amount, 0);

  const pieData = [
    { name: "Recebido", value: totalReceived, color: "#d4af37" },
    { name: "Pendente", value: totalPending, color: "#6b7280" },
    { name: "Cancelado", value: totalFailed, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const stats = [
    {
      label: "Total Recebido",
      value: formatCurrency(totalReceived),
      icon: CheckCircle,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Pendente",
      value: formatCurrency(totalPending),
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      label: "Cancelado/Falhou",
      value: formatCurrency(totalFailed),
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Total Transações",
      value: payments.length.toString(),
      icon: CreditCard,
      color: "text-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-lg font-serif text-foreground">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monthly Bar Chart */}
        <Card className="col-span-2 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              Faturamento Mensal
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Total"]}
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "4px",
                }}
                labelStyle={{ color: "#d4af37" }}
              />
              <Bar
                dataKey="total"
                fill="#d4af37"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              Distribuição
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value)]}
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "4px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {pieData.map((d, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-[10px] text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
