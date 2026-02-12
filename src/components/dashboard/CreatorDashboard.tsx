"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Megaphone,
    TrendingUp,
    DollarSign,
    Eye,
    Store,
    ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export function CreatorDashboard() {
    const stats = [
        {
            title: "Total Earnings",
            value: formatCurrency(45000),
            change: "+₹12K this month",
            icon: DollarSign,
            color: "text-green-600",
            bgColor: "bg-green-100",
        },
        {
            title: "Active Campaigns",
            value: "5",
            change: "2 pending approval",
            icon: Megaphone,
            color: "text-primary",
            bgColor: "bg-primary/10",
        },
        {
            title: "Total Views",
            value: "850K",
            change: "+23% vs last month",
            icon: Eye,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
        },
        {
            title: "Creator Tier",
            value: "Silver",
            change: "5 more campaigns to Gold",
            icon: TrendingUp,
            color: "text-orange-600",
            bgColor: "bg-orange-100",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Creator Dashboard</h1>
                    <p className="text-muted-foreground">
                        Track your earnings and discover opportunities
                    </p>
                </div>
                <Link href="/marketplace">
                    <Button className="gap-2">
                        <Store className="h-4 w-4" />
                        Browse Campaigns
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">{stat.change}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Active Campaigns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "Smart Watch Review", brand: "TechGear", earnings: "₹8,000", status: "Live" },
                                { name: "Summer Fashion", brand: "StyleCo", earnings: "₹5,500", status: "In Review" },
                                { name: "Fitness Product", brand: "HealthPlus", earnings: "₹3,200", status: "Live" },
                            ].map((campaign, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div>
                                        <p className="font-medium">{campaign.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            by {campaign.brand}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-green-600">{campaign.earnings}</p>
                                        <span
                                            className={`text-xs ${campaign.status === "Live"
                                                    ? "text-green-600"
                                                    : "text-orange-600"
                                                }`}
                                        >
                                            {campaign.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link href="/my-campaigns">
                            <Button variant="outline" className="mt-4 w-full gap-2">
                                View All My Campaigns
                                <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>New Opportunities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "Crypto App Launch", budget: "₹50K", type: "UGC", match: "95%" },
                                { name: "Gaming Headset", budget: "₹25K", type: "Clipping", match: "88%" },
                                { name: "Beauty Serum", budget: "₹35K", type: "Just Posting", match: "82%" },
                            ].map((opportunity, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div>
                                        <p className="font-medium">{opportunity.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {opportunity.type} • Budget: {opportunity.budget}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                                        {opportunity.match} match
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Link href="/marketplace">
                            <Button variant="outline" className="mt-4 w-full gap-2">
                                Explore Marketplace
                                <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
