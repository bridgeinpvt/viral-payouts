"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Megaphone,
    Users,
    Eye,
    Plus,
    ArrowUpRight,
    DollarSign,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export function BrandDashboard() {
    const stats = [
        {
            title: "Active Campaigns",
            value: "3",
            change: "+1 this week",
            icon: Megaphone,
            color: "text-primary",
            bgColor: "bg-primary/10",
        },
        {
            title: "Total Reach",
            value: "1.2M",
            change: "+15% vs last month",
            icon: Eye,
            color: "text-green-600",
            bgColor: "bg-green-100",
        },
        {
            title: "Creators Engaged",
            value: "47",
            change: "+12 new",
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
        },
        {
            title: "Budget Spent",
            value: formatCurrency(125000),
            change: "₹75K remaining",
            icon: DollarSign,
            color: "text-orange-600",
            bgColor: "bg-orange-100",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Brand Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage your campaigns and track performance
                    </p>
                </div>
                <Link href="/campaigns/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Campaign
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
                        <CardTitle>Recent Campaigns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "Summer Collection Launch", status: "Active", views: "450K" },
                                { name: "Product Review Campaign", status: "Active", views: "280K" },
                                { name: "Brand Awareness Push", status: "Completed", views: "1.2M" },
                            ].map((campaign, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div>
                                        <p className="font-medium">{campaign.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {campaign.views} views
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs ${campaign.status === "Active"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`}
                                    >
                                        {campaign.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Link href="/campaigns">
                            <Button variant="outline" className="mt-4 w-full gap-2">
                                View All Campaigns
                                <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Performing Creators</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "Sarah Fashion", views: "150K", earnings: "₹15,000" },
                                { name: "Tech Reviewer Pro", views: "120K", earnings: "₹12,000" },
                                { name: "Lifestyle Vlogs", views: "95K", earnings: "₹9,500" },
                            ].map((creator, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                                            {creator.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium">{creator.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {creator.views} views
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-medium text-green-600">
                                        {creator.earnings}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Link href="/creators">
                            <Button variant="outline" className="mt-4 w-full gap-2">
                                View All Creators
                                <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
