"use client";

import { useState, useEffect } from 'react';
import { getSentCVUpdateRequestsBUL, cancelCVUpdateRequest, SentCVUpdateRequest } from '@/services/cv';
import { AlertCircle, FileText, X, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function BULCVRequestsTab() {
  const [sentRequests, setSentRequests] = useState<SentCVUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSentRequests();
  }, []);

  const loadSentRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const requests = await getSentCVUpdateRequestsBUL();
      setSentRequests(requests || []); // Ensure we always set an array
    } catch (err) {
      console.error('Error loading sent CV requests:', err);
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải danh sách yêu cầu');
      setSentRequests([]); // Set empty array on error
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



  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Đã xử lý':
        return 'bg-green-100 text-green-800';
      case 'Đang yêu cầu':
        return 'bg-yellow-100 text-yellow-800';
      case 'Đã huỷ':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter requests based on status and search term
  const filteredRequests = (sentRequests || []).filter(request => {
    const matchesSearch = ((request.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.employee_code || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || request.status === statusFilter;
    return matchesSearch && matchesStatus;
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Yêu cầu cập nhật CV</h2>
        <div className="text-sm text-gray-600 mt-1">Trang chủ / Yêu cầu cập nhật</div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-lg shadow-md">
        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Box */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên nhân viên hoặc mã nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Status Filter */}
            <div className="lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Đang yêu cầu">Đang yêu cầu</option>
                <option value="Đã xử lý">Đã xử lý</option>
                <option value="Đã huỷ">Đã huỷ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
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
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nội dung
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian gửi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">
                        {(sentRequests || []).length === 0 ? 'Chưa có yêu cầu nào' : 'Không có yêu cầu nào phù hợp với bộ lọc'}
                      </p>
                      <p className="text-sm">
                        {(sentRequests || []).length === 0 ? 'Bạn chưa gửi yêu cầu cập nhật CV nào.' : 'Thử thay đổi bộ lọc để xem kết quả khác.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.employee_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.employee_code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="truncate" title={request.content || ''}>
                          {request.content || 'Không có nội dung'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(request.requested_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {request.status !== 'Đã huỷ' && request.status !== 'Đã xử lý' && (
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
    </div>
  );
}
