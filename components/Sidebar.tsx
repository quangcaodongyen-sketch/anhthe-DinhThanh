import React from 'react';
import type { Page } from '../App';
import { SparklesIcon } from './icons/SparklesIcon';
import { IDCardIcon } from './icons/IDCardIcon';
import { LayoutGridIcon } from './icons/LayoutGridIcon';
import { UsersIcon } from './icons/UsersIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { StudentCardIcon } from './icons/StudentCardIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  page: Page;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}> = ({ icon, label, page, currentPage, setCurrentPage }) => (
  <li>
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex flex-col items-center justify-center w-full py-3 px-1 text-xs font-medium transition-colors duration-200 rounded-md
        ${currentPage === page
          ? 'bg-cyan-500/20 text-cyan-300'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
        }`}
    >
      <div className="w-6 h-6 mb-1">{icon}</div>
      <span>{label}</span>
    </button>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  return (
    <aside className="w-24 bg-[#1E293B] flex-shrink-0 flex flex-col border-r border-slate-800 shadow-lg">
      <nav className="flex-grow p-2">
        <ul className="space-y-2">
          <NavItem
            icon={<SparklesIcon />}
            label="Phục hồi"
            page="restorer"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <NavItem
            icon={<IDCardIcon />}
            label="Ảnh thẻ"
            page="idphoto"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <NavItem
            icon={<LayoutGridIcon />}
            label="Xếp & In"
            page="printlayout"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <NavItem
            icon={<UsersIcon />}
            label="Khách hàng"
            page="customerhistory"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <NavItem
            icon={<DocumentTextIcon />}
            label="Văn bản"
            page="documentrestorer"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <NavItem
            icon={<StudentCardIcon />}
            label="Thẻ SV"
            page="studentcard"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <NavItem
            icon={<MagicWandIcon />}
            label="Style"
            page="style"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <NavItem
            icon={<BeakerIcon />}
            label="Hack Concept"
            page="hackconcept"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </ul>
      </nav>
    </aside>
  );
};

// FIX: Add default export to make the component importable.
export default Sidebar;
