import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function Forbidden() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center flex-col px-6">
      <h1 className="font-serif text-8xl font-bold text-text-tertiary/30 select-none">
        403
      </h1>
      <p className="text-xl text-text-secondary mt-4 mb-2">
        无权访问
      </p>
      <p className="text-sm text-text-tertiary mb-8">
        您无权访问此页面，请联系管理员
      </p>
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="secondary" size="default" className="rounded-full px-6">
            返回首页
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="primary" size="default" className="rounded-full px-6">
            去登录
          </Button>
        </Link>
      </div>
    </div>
  );
}
