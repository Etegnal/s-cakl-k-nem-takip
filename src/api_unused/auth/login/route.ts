import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gereklidir.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya şifre hatalı.' },
        { status: 401 }
      );
    }

    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya şifre hatalı.' },
        { status: 401 }
      );
    }

    // Sign JWT and set cookie
    const token = await signToken({ userId: user.id, username: user.username });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Giriş işlemi sırasında sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
