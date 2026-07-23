'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { BookOpenText, ScrollText } from 'lucide-react';

type AuthorProfileTabsProps = {
  works: ReactNode;
  about: ReactNode;
  worksCount: number;
};

type AuthorTab = 'works' | 'about';

export default function AuthorProfileTabs({
  works,
  about,
  worksCount,
}: AuthorProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<AuthorTab>('works');
  const id = useId();

  const tabs = [
    {
      id: 'works' as const,
      label: 'Tác phẩm',
      icon: ScrollText,
      count: worksCount,
    },
    {
      id: 'about' as const,
      label: 'Giới thiệu',
      icon: BookOpenText,
    },
  ];

  return (
    <section className="author-public-tabs">
      <div className="author-public-tabs__nav" role="tablist" aria-label="Nội dung đạo tịch tác giả">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`${id}-${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${id}-${tab.id}-panel`}
              className={isActive ? 'is-active' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{tab.label}</span>
              {'count' in tab ? <small>{tab.count}</small> : null}
            </button>
          );
        })}
      </div>

      <div
        id={`${id}-works-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-works-tab`}
        hidden={activeTab !== 'works'}
        className="author-public-tabs__panel"
      >
        {works}
      </div>

      <div
        id={`${id}-about-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-about-tab`}
        hidden={activeTab !== 'about'}
        className="author-public-tabs__panel"
      >
        {about}
      </div>
    </section>
  );
}
