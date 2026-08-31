import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { accessToken, userToken } = await request.json();
    const token = accessToken || userToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Chưa nhận được Access Token từ Facebook' },
        { status: 400 }
      );
    }

    // 1. Fetch user's managed Facebook Pages via Meta Graph API
    const graphRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,picture.type(large),fan_count&access_token=${token}`
    );
    const graphJson = await graphRes.json();

    if (graphJson.error) {
      console.error('Meta Graph API accounts error:', graphJson.error);
      return NextResponse.json(
        { 
          success: false, 
          error: graphJson.error.message || 'Lỗi xác thực với máy chủ Meta Facebook' 
        },
        { status: 400 }
      );
    }

    const pages = (graphJson.data || []).map((page: any) => ({
      id: page.id,
      name: page.name,
      category: page.category || 'Doanh nghiệp / Fanpage',
      followers: page.fan_count ? `${(page.fan_count / 1000).toFixed(1)}K` : undefined,
      avatarUrl: page.picture?.data?.url || `https://graph.facebook.com/${page.id}/picture?type=large`,
      pageAccessToken: page.access_token,
    }));

    return NextResponse.json({
      success: true,
      data: pages,
      count: pages.length,
    });
  } catch (error: any) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý đăng nhập Facebook' },
      { status: 500 }
    );
  }
}
