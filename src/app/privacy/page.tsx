import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 border-b pb-4">Chính Sách Quyền Riêng Tư & Bảo Mật Dữ Liệu</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        Hệ thống Quản trị Tin nhắn Đa kênh Omnichannel cam kết bảo mật tuyệt đối dữ liệu tin nhắn và quyền riêng tư của khách hàng cũng như các Fanpage được liên kết theo tiêu chuẩn Meta Platform Terms.
      </p>
      <div className="space-y-3 text-sm">
        <h2 className="font-semibold text-base">1. Thu thập và sử dụng dữ liệu</h2>
        <p className="text-slate-600">
          Ứng dụng chỉ yêu cầu quyền đọc và gửi tin nhắn (pages_messaging) nhằm mục đích duy nhất là hỗ trợ nhân viên tư vấn và quản lý hội thoại khách hàng tập trung. Chúng tôi không chia sẻ dữ liệu với bất kỳ bên thứ ba nào.
        </p>
        <h2 className="font-semibold text-base">2. Xóa và bảo lưu dữ liệu</h2>
        <p className="text-slate-600">
          Quản trị viên có toàn quyền ngắt kết nối Fanpage và xóa dữ liệu hội thoại khỏi cơ sở dữ liệu bất kỳ lúc nào trên trang Cài đặt Kênh.
        </p>
      </div>
      <p className="text-xs text-slate-400 pt-6 border-t">Cập nhật lần cuối: 2026</p>
    </div>
  );
}
