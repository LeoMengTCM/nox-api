import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center flex-col px-6">
      <h1 className="font-serif text-8xl font-bold text-text-tertiary/30 select-none">
        404
      </h1>
      <p className="text-xl text-text-secondary mt-4 mb-2">
        页面未找到
      </p>
      <p className="text-sm text-text-tertiary mb-8">
        请检查您的浏览器地址是否正确
      </p>
      <Link to="/">
        <Button variant="primary" size="default" className="rounded-full px-6">
          返回首页
        </Button>
      </Link>
    </div>
  );
}
