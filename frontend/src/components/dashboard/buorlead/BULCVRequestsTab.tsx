"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { getSentCVUpdateRequestsBUL, cancelCVUpdateRequest } from '@/services/cv';
import { Clock, CheckCircle, XCircle, AlertCircle, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BULCVRequestsTabProps {
  user: User;
}

interface SentCVRequest {
  id: string;
  cv_id: string;
  requested_by: string;
  requested_at: string;
  status: 'Đang yêu cầu' | 'Đã xử lý' | 'Đã huỷ';
  is_read: boolean;
  employee_name: string;
  employee_code: string;
  department: string;
  content?: string;
}

export default function BULCVRequestsTab({ user }: BULCVRequestsTabProps) {
  const [sentRequests, setSentRequests] = useState<SentCVRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadSentRequests();
  }, []);

  const loadSentRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const requests = await getSentCVUpdateRequestsBUL();
      setSentRequests(requests);
    } catch (err) {
      console.error('Error loading sent CV requests:', err);
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancellingRequest(requestId);
      await cancelCVUpdateRequest(requestId);

      // Update local state to reflect the change
      setSentRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: 'Đã huỷ' as const }
          : req
      ));

      toast.success('Đã hủy yêu cầu cập nhật CV thành công');
    } catch (error) {
      console.error('Failed to cancel CV update request:', error);
      toast.error('Không thể hủy yêu cầu cập nhật CV');
    } finally {
      setCancellingRequest(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Đang yêu cầu':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Đã xử lý':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Đã huỷ':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'Đang yêu cầu':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Đã xử lý':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Đã huỷ':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter requests based on status
  const filteredRequests = sentRequests.filter(request => {
    const matchesStatus = !statusFilter || request.status === statusFilter;
    return matchesStatus;
  });

  if (loading) {
    return (
      <div className="w-full p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60012]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu cập nhật CV</h1>
        <p className="text-gray-600 mt-1">
          Danh sách các yêu cầu cập nhật CV bạn đã gửi
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex justify-end">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Đang yêu cầu">Đang yêu cầu</option>
          <option value="Đã xử lý">Đã xử lý</option>
          <option value="Đã huỷ">Đã huỷ</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={loadSentRequests}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gửi đến
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã nhân viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian gửi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nội dung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      {sentRequests.length === 0 ? 'Chưa có yêu cầu nào' : 'Không có yêu cầu nào phù hợp với bộ lọc'}
                    </p>
                    <p className="text-sm">
                      {sentRequests.length === 0 ? 'Bạn chưa gửi yêu cầu cập nhật CV nào.' : 'Thử thay đổi bộ lọc để xem kết quả khác.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.employee_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.employee_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(request.requested_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        <span className={getStatusBadge(request.status)}>
                          {request.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {request.content || 'Không có nội dung'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {request.status === 'Đang yêu cầu' && (
                          <button
                            className="p-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Hủy yêu cầu"
                            disabled={cancellingRequest === request.id}
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            {cancellingRequest === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
