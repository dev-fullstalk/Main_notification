import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Cấu hình giới hạn dung lượng: 25MB tối đa
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;  // 25MB

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.vbe', '.wsf', '.wsh', '.scr', '.pif'
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy tệp để tải lên (file is missing)' },
        { status: 400 }
      );
    }

    const originalName = file.name || 'unnamed-file';
    const ext = path.extname(originalName).toLowerCase();

    // 1. Kiểm tra phần mở rộng file bị chặn (Bảo mật máy chủ)
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Định dạng tệp ${ext} không được phép tải lên vì lý do bảo mật.` },
        { status: 400 }
      );
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    // 2. Kiểm tra giới hạn dung lượng
    const sizeLimit = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > sizeLimit) {
      const limitMb = Math.round(sizeLimit / (1024 * 1024));
      return NextResponse.json(
        { success: false, error: `Dung lượng tệp vượt quá giới hạn cho phép (${limitMb}MB).` },
        { status: 400 }
      );
    }

    // 3. Chuẩn bị thư mục lưu trữ theo Tháng: public/uploads/YYYY-MM/
    const now = new Date();
    const folderName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folderName);

    await fs.mkdir(uploadDir, { recursive: true });

    // 4. Sinh tên tệp an toàn và duy nhất
    const sanitizedBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalFileName = `${sanitizedBase}-${uniqueSuffix}${ext || (isImage ? '.jpg' : '.bin')}`;
    const filePath = path.join(uploadDir, finalFileName);

    // 5. Ghi tệp vào ổ đĩa
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // 6. Đường dẫn truy cập công khai
    const publicUrl = `/uploads/${folderName}/${finalFileName}`;

    const determinedType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        name: originalName,
        size: file.size,
        type: determinedType,
      },
    });
  } catch (error: any) {
    console.error('Lỗi upload file:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý tải tệp' },
      { status: 500 }
    );
  }
}
