import { useState, useEffect } from 'react';
import { Mail, Clock, CheckCircle2, AlertCircle, Loader2, Download, File } from 'lucide-react';
import { toast } from 'sonner';
import { inquiryAPI } from '../../services/api';

export function AdminInquiries() {
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'resolved'>('all');

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        try {
            const data = await inquiryAPI.getAllInquiries();
            console.log("Inquiries data received:", data);
            console.log("Inquiries array:", data.inquiries);
            setInquiries(data.inquiries || []);
        } catch (error) {
            console.error("Failed to fetch inquiries", error);
            toast.error("Failed to load inquiries");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            setResolvingId(id);
            const updated = await inquiryAPI.updateStatus(id, newStatus);
            setInquiries(
                inquiries.map((inq) => (inq._id === id ? updated : inq))
            );
            toast.success(`Inquiry marked as ${newStatus}`);
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update inquiry status");
        } finally {
            setResolvingId(null);
        }
    };

    const handleDownloadDocument = async (inquiryId: string, documentIndex: number, filename: string) => {
        try {
            const response = await inquiryAPI.downloadDocument(inquiryId, documentIndex);
            
            // response.data is already a Blob when responseType is 'blob'
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success(`Downloaded ${filename}`);
        } catch (error: any) {
            console.error("Failed to download document", error);
            console.error("Error details:", error.response?.data || error.message);
            const errorMsg = error.response?.data?.message || "Failed to download document";
            toast.error(errorMsg);
        }
    };

    const [expandedDocuments, setExpandedDocuments] = useState<string | null>(null);

    const toggleDocumentExpand = (inquiryId: string) => {
        setExpandedDocuments(expandedDocuments === inquiryId ? null : inquiryId);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Resolved':
                return 'bg-green-100 text-green-700';
            case 'Reviewed':
                return 'bg-blue-100 text-blue-700';
            case 'Pending':
            default:
                return 'bg-yellow-100 text-yellow-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Resolved':
                return <CheckCircle2 className="w-4 h-4" />;
            case 'Reviewed':
                return <Clock className="w-4 h-4" />;
            case 'Pending':
            default:
                return <AlertCircle className="w-4 h-4" />;
        }
    };

    const totalInquiries = inquiries.length;
    const pendingCount = inquiries.filter((i) => i.status === 'Pending').length;
    const resolvedCount = inquiries.filter((i) => i.status === 'Resolved').length;
    const pendingRate = totalInquiries > 0
        ? Math.round((pendingCount / totalInquiries) * 100)
        : 0;

    const resolutionRate = totalInquiries > 0
        ? Math.round((resolvedCount / totalInquiries) * 100)
        : 0;

    const now = new Date();
    const todayDateKey = now.toDateString();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const currentWindowStart = new Date(now.getTime() - oneWeekMs);
    const previousWindowStart = new Date(now.getTime() - 2 * oneWeekMs);

    const inDateRange = (dateValue: string, start: Date, end: Date) => {
        const date = new Date(dateValue);
        return !Number.isNaN(date.getTime()) && date >= start && date < end;
    };

    const newTodayCount = inquiries.filter((inq) => {
        const createdDate = new Date(inq.createdAt);
        return !Number.isNaN(createdDate.getTime()) && createdDate.toDateString() === todayDateKey;
    }).length;

    const pendingAvgResponseHours = pendingCount > 0
        ? Math.round(
            inquiries
                .filter((inq) => inq.status === 'Pending')
                .reduce((sum, inq) => {
                    const createdDate = new Date(inq.createdAt);
                    if (Number.isNaN(createdDate.getTime())) return sum;
                    const hours = Math.max(0, (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
                    return sum + hours;
                }, 0) / pendingCount
        )
        : 0;

    const trendPercentage = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const totalCurrentWeek = inquiries.filter((inq) =>
        inDateRange(inq.createdAt, currentWindowStart, now)
    ).length;
    const totalPreviousWeek = inquiries.filter((inq) =>
        inDateRange(inq.createdAt, previousWindowStart, currentWindowStart)
    ).length;
    const totalTrend = trendPercentage(totalCurrentWeek, totalPreviousWeek);

    const pendingCurrentWeek = inquiries.filter((inq) =>
        inq.status === 'Pending' && inDateRange(inq.createdAt, currentWindowStart, now)
    ).length;
    const pendingPreviousWeek = inquiries.filter((inq) =>
        inq.status === 'Pending' && inDateRange(inq.createdAt, previousWindowStart, currentWindowStart)
    ).length;
    const pendingTrendRaw = trendPercentage(pendingCurrentWeek, pendingPreviousWeek);

    const resolvedCurrentWeek = inquiries.filter((inq) =>
        inq.status === 'Resolved' && inDateRange(inq.createdAt, currentWindowStart, now)
    ).length;
    const resolvedPreviousWeek = inquiries.filter((inq) =>
        inq.status === 'Resolved' && inDateRange(inq.createdAt, previousWindowStart, currentWindowStart)
    ).length;
    const resolvedTrend = trendPercentage(resolvedCurrentWeek, resolvedPreviousWeek);

    const filteredInquiries = inquiries.filter((inq) => {
        if (activeFilter === 'pending') return inq.status === 'Pending';
        if (activeFilter === 'resolved') return inq.status === 'Resolved';
        return true;
    });

    const getInquiryTypeColor = (type: string) => {
        const colorMap: { [key: string]: { border: string; badge: string; badgeText: string } } = {
            'Complaint': { border: '#8B5CF6', badge: '#F3F0FF', badgeText: '#6D28D9' },
            'Natural Disaster': { border: '#F97316', badge: '#FFF7ED', badgeText: '#C2410C' },
            'General Inquiry': { border: '#3B82F6', badge: '#EFF6FF', badgeText: '#1D4ED8' },
            'Feedback': { border: '#10B981', badge: '#ECFDF5', badgeText: '#065F46' },
            'Other': { border: '#6B7280', badge: '#F3F4F6', badgeText: '#374151' }
        };
        return colorMap[type] || colorMap['Other'];
    };

    const timeAgo = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const renderTrend = (trend: number, cardType: 'total' | 'pending' | 'resolved') => {
        const isIncrease = trend >= 0;
        const arrow = isIncrease ? '↑' : '↓';
        
        let pillStyle = {};
        if (cardType === 'total') {
            pillStyle = { background: '#DBEAFE', color: '#1E40AF' };
        } else if (cardType === 'pending') {
            pillStyle = { background: '#FFEDD5', color: '#9A3412' };
        } else {
            pillStyle = { background: '#DCFCE7', color: '#166534' };
        }

        return (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ ...pillStyle, borderRadius: '999px' }}>
                {arrow} {Math.abs(trend)}% this week
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Farmer Inquiries</h2>
                <p className="text-gray-600">Review and manage support requests from farmers.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Inquiries Card */}
                <button
                    onClick={() => setActiveFilter('all')}
                    className="relative min-h-[120px] text-left cursor-pointer transition-all duration-[250ms] ease-out"
                    style={{
                        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                        border: '1px solid #BFDBFE',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        boxShadow: activeFilter === 'all' ? '0 12px 28px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
                        transform: activeFilter === 'all' ? 'translateY(-6px)' : 'none',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                        if (activeFilter !== 'all') {
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)';
                            e.currentTarget.style.borderColor = '#BFDBFE';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeFilter !== 'all') {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                            e.currentTarget.style.borderColor = '#BFDBFE';
                        }
                    }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div style={{
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '10px',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Mail style={{ width: '20px', height: '20px', color: '#1D4ED8' }} />
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>Total Inquiries</p>
                    </div>
                    <p style={{ fontSize: '38px', fontWeight: '700', color: '#1D4ED8', marginBottom: '8px', lineHeight: '1' }}>{totalInquiries}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                        {renderTrend(totalTrend, 'total')}
                        <p style={{ fontSize: '12px', color: '#3B82F6' }}>{newTodayCount} new today</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <div style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.6)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                borderRadius: '999px',
                                background: '#3B82F6',
                                width: '100%'
                            }} />
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '600', minWidth: '32px', textAlign: 'right', color: '#1D4ED8' }}>100%</p>
                    </div>
                </button>

                {/* Pending Action Card */}
                <button
                    onClick={() => setActiveFilter('pending')}
                    className="relative min-h-[120px] text-left cursor-pointer transition-all duration-[250ms] ease-out"
                    style={{
                        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                        border: '1px solid #FED7AA',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        boxShadow: activeFilter === 'pending' ? '0 12px 28px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
                        transform: activeFilter === 'pending' ? 'translateY(-6px)' : 'none',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                        if (activeFilter !== 'pending') {
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)';
                            e.currentTarget.style.borderColor = '#FED7AA';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeFilter !== 'pending') {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                            e.currentTarget.style.borderColor = '#FED7AA';
                        }
                    }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div style={{
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '10px',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <AlertCircle style={{ width: '20px', height: '20px', color: '#C2410C' }} />
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#EA580C' }}>Pending Action</p>
                    </div>
                    <p style={{ fontSize: '38px', fontWeight: '700', color: '#C2410C', marginBottom: '8px', lineHeight: '1' }}>{pendingCount}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                        {renderTrend(pendingTrendRaw, 'pending')}
                        <p style={{ fontSize: '12px', color: '#EA580C' }}>
                            {pendingCount === 0 ? 'All clear' : `Avg. ${pendingAvgResponseHours}h response time`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <div style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.6)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                borderRadius: '999px',
                                background: '#F97316',
                                width: totalInquiries > 0 ? `${(pendingCount / totalInquiries) * 100}%` : '0%'
                            }} />
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '600', minWidth: '32px', textAlign: 'right', color: '#C2410C' }}>
                            {totalInquiries > 0 ? Math.round((pendingCount / totalInquiries) * 100) : 0}%
                        </p>
                    </div>
                </button>

                {/* Resolved Card */}
                <button
                    onClick={() => setActiveFilter('resolved')}
                    className="relative min-h-[120px] text-left cursor-pointer transition-all duration-[250ms] ease-out"
                    style={{
                        background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                        border: '1px solid #BBF7D0',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        boxShadow: activeFilter === 'resolved' ? '0 12px 28px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
                        transform: activeFilter === 'resolved' ? 'translateY(-6px)' : 'none',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                        if (activeFilter !== 'resolved') {
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)';
                            e.currentTarget.style.borderColor = '#BBF7D0';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeFilter !== 'resolved') {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                            e.currentTarget.style.borderColor = '#BBF7D0';
                        }
                    }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div style={{
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '10px',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <CheckCircle2 style={{ width: '20px', height: '20px', color: '#15803D' }} />
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#16A34A' }}>Resolved</p>
                    </div>
                    <p style={{ fontSize: '38px', fontWeight: '700', color: '#15803D', marginBottom: '8px', lineHeight: '1' }}>{resolvedCount}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                        {renderTrend(resolvedTrend, 'resolved')}
                        <p style={{ fontSize: '12px', color: '#16A34A' }}>{resolutionRate}% resolution rate</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <div style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.6)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                borderRadius: '999px',
                                background: '#22C55E',
                                width: totalInquiries > 0 ? `${(resolvedCount / totalInquiries) * 100}%` : '0%'
                            }} />
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '600', minWidth: '32px', textAlign: 'right', color: '#15803D' }}>
                            {totalInquiries > 0 ? Math.round((resolvedCount / totalInquiries) * 100) : 0}%
                        </p>
                    </div>
                </button>
            </div>

            {/* Inquiries List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {activeFilter === 'all' ? 'Recent Submissions' : activeFilter === 'pending' ? 'Pending Inquiries' : 'Resolved Inquiries'}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                        </div>
                    ) : filteredInquiries.length > 0 ? (
                        filteredInquiries.map((inq) => {
                            let displaySubject = inq.subject;
                            let displayCategory = "Support";
                            const match = inq.subject.match(/^\[(.*?)\] (.*)$/);
                            if (match) {
                                displayCategory = match[1];
                                displaySubject = match[2];
                            }

                            const farmerName = inq.farmer ? `${inq.farmer.firstName} ${inq.farmer.lastName}` : "Unknown Farmer";
                            const farmerDistrict = inq.farmer?.district || "Unknown District";
                            const typeColor = getInquiryTypeColor(displayCategory);
                            const fullDate = new Date(inq.createdAt).toLocaleString();

                            return (
                                <div
                                    key={inq._id}
                                    style={{
                                        background: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderLeft: `4px solid ${typeColor.border}`,
                                        borderRadius: '14px',
                                        padding: '20px 24px',
                                        marginBottom: '16px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.09)';
                                        e.currentTarget.style.borderColor = '#D1D5DB';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                                        e.currentTarget.style.borderColor = '#E5E7EB';
                                    }}
                                >
                                    {/* Badge + Title Row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                        <span style={{
                                            padding: '3px 12px',
                                            borderRadius: '999px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: typeColor.badge,
                                            color: typeColor.badgeText,
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {displayCategory}
                                        </span>
                                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                            {displaySubject}
                                        </h4>
                                    </div>

                                    {/* Info Row with Icons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                                                <circle cx="8" cy="5" r="2.5" stroke="#6B7280" strokeWidth="1.5" />
                                                <path d="M8 7.5C6.067 7.5 4.5 9.067 4.5 11V13.5H11.5V11C11.5 9.067 9.933 7.5 8 7.5Z" stroke="#6B7280" strokeWidth="1.5" />
                                            </svg>
                                            <span style={{ fontWeight: '600', color: '#374151', fontSize: '13px' }}>{farmerName}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                                                <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8C1.5 11.59 4.41 14.5 8 14.5C11.59 14.5 14.5 11.59 14.5 8C14.5 4.41 11.59 1.5 8 1.5Z" stroke="#6B7280" strokeWidth="1.5" />
                                                <path d="M9 5H7V8.5C7 8.78 7.22 9 7.5 9H10.5" stroke="#6B7280" strokeWidth="1.5" />
                                            </svg>
                                            <span style={{ color: '#6B7280', fontSize: '13px' }}>{farmerDistrict}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                                                <rect x="2" y="3.5" width="12" height="10.5" rx="1" stroke="#6B7280" strokeWidth="1.5" />
                                                <path d="M2 5.5H14" stroke="#6B7280" strokeWidth="1.5" />
                                            </svg>
                                            <span style={{ color: '#6B7280', fontSize: '13px' }} title={fullDate}>{timeAgo(inq.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Status + Action Row */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', gap: '12px', flexWrap: 'wrap' }}>
                                        <div>
                                            {inq.status === 'Resolved' ? (
                                                <div style={{
                                                    background: '#ECFDF5',
                                                    color: '#065F46',
                                                    border: '1px solid #6EE7B7',
                                                    padding: '4px 12px',
                                                    borderRadius: '999px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <CheckCircle2 size={14} />
                                                    Resolved
                                                </div>
                                            ) : (
                                                <div style={{
                                                    background: '#FFFBEB',
                                                    color: '#92400E',
                                                    border: '1px solid #FCD34D',
                                                    padding: '4px 12px',
                                                    borderRadius: '999px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <AlertCircle size={14} />
                                                    Pending
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Download Button - Always Visible */}
                                            <button
                                                onClick={() => toggleDocumentExpand(inq._id)}
                                                disabled={!inq.documents || inq.documents.length === 0}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: (inq.documents && inq.documents.length > 0) ? '#DBEAFE' : '#E5E7EB',
                                                    color: (inq.documents && inq.documents.length > 0) ? '#1E40AF' : '#9CA3AF',
                                                    border: '1px solid ' + ((inq.documents && inq.documents.length > 0) ? '#93C5FD' : '#D1D5DB'),
                                                    padding: '6px 14px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: (inq.documents && inq.documents.length > 0) ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.2s ease',
                                                    opacity: (inq.documents && inq.documents.length > 0) ? 1 : 0.6,
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (inq.documents && inq.documents.length > 0) {
                                                        e.currentTarget.style.background = '#BFDBFE';
                                                        e.currentTarget.style.borderColor = '#60A5FA';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (inq.documents && inq.documents.length > 0) {
                                                        e.currentTarget.style.background = '#DBEAFE';
                                                        e.currentTarget.style.borderColor = '#93C5FD';
                                                    }
                                                }}
                                            >
                                                <Download size={14} />
                                                Documents {inq.documents && inq.documents.length > 0 ? `(${inq.documents.length})` : '(0)'}
                                            </button>

                                        <select
                                            value={inq.status}
                                            onChange={(e) => handleStatusUpdate(inq._id, e.target.value)}
                                            disabled={resolvingId === inq._id}
                                            style={{
                                                background: 'white',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '8px',
                                                padding: '6px 14px',
                                                fontSize: '13px',
                                                color: '#374151',
                                                cursor: resolvingId === inq._id ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s ease',
                                                marginLeft: 'auto'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (resolvingId !== inq._id) {
                                                    e.currentTarget.style.background = '#F9FAFB';
                                                    e.currentTarget.style.borderColor = '#D1D5DB';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.borderColor = '#E5E7EB';
                                            }}
                                        >
                                            <option value="Pending">Mark Pending</option>
                                            <option value="Reviewed">Mark Reviewed</option>
                                            <option value="Resolved">Mark Resolved</option>
                                        </select>
                                        {resolvingId === inq._id && <Loader2 className="w-4 h-4 text-green-600 animate-spin" />}
                                    </div>

                                    {/* Message Preview Box */}
                                    <div style={{
                                        marginTop: '14px',
                                        background: '#F9FAFB',
                                        borderRadius: '8px',
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        color: '#4B5563',
                                        fontStyle: 'italic',
                                        lineHeight: '1.6',
                                        borderLeft: '3px solid #E5E7EB'
                                    }}>
                                        {inq.message}
                                    </div>

                                    {/* Supporting Documents Section */}
                                    {inq.documents && inq.documents.length > 0 && expandedDocuments === inq._id && (
                                        <div style={{
                                            marginTop: '16px',
                                            padding: '12px 16px',
                                            background: '#F0F9FF',
                                            border: '1px solid #BFDBFE',
                                            borderRadius: '8px'
                                        }}>
                                            <h5 style={{
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#1E40AF',
                                                marginBottom: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <File size={14} />
                                                Supporting Documents ({inq.documents.length})
                                            </h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                                                {inq.documents.map((doc: any, docIndex: number) => (
                                                    <button
                                                        key={docIndex}
                                                        onClick={() => handleDownloadDocument(inq._id, docIndex, doc.originalname)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '8px 12px',
                                                            background: 'white',
                                                            border: '1px solid #DBEAFE',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            color: '#1E40AF',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            textAlign: 'left'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#EFF6FF';
                                                            e.currentTarget.style.borderColor = '#3B82F6';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'white';
                                                            e.currentTarget.style.borderColor = '#DBEAFE';
                                                        }}
                                                    >
                                                        <Download size={14} />
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            <div style={{ fontWeight: '500' }}>{doc.originalname}</div>
                                                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                                                {(doc.size / 1024).toFixed(2)} KB
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12">
                            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">
                                {activeFilter === 'all' ? 'No inquiries found.' : 'No inquiries match this filter.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
