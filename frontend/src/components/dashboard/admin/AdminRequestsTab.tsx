"use client";

import { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllCVUpdateRequestsForAdmin, cancelCVUpdateRequest, AdminCVUpdateRequest } from '@/services/admin';

export default function AdminRequestsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requests, setRequests] = useState<AdminCVUpdateRequest[]>([]); // Khởi tạo là mảng rỗng thay vì undefined
  const [loading, setLoading] = useState(true);
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);

  // Fetch all CV update requests on component mount
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const allRequests = await getAllCVUpdateRequestsForAdmin();
        setRequests(allRequests || []);
      } catch (error) {
        console.error('Failed to fetch CV update requests:', error);
        toast.error('Không thể tải danh sách yêu cầu cập nhật CV');
        setRequests([]); // Đặt thành mảng rỗng nếu có lỗi
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

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

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancellingRequest(requestId);
      await cancelCVUpdateRequest(requestId);

      // Update local state to reflect the change
      setRequests(prev => prev.map(req =>
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

  // Thêm kiểm tra để đảm bảo requests không null trước khi filter
  const filteredRequests = requests?.filter(request => {
    const matchesSearch = ((request.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.requester_name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

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
                placeholder="Tìm kiếm yêu cầu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Status Filter */}
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người yêu cầu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nội dung
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian tạo
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
                      Không có yêu cầu cập nhật CV nào
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.employee_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.requester_name || 'N/A'}
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
          )}
        </div>
      </div>
    </div>
  );
}
