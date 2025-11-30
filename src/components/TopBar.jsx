import React from 'react';
import LanguagePicker from './elements/LanguagePicker.jsx';
import swapIcon from '../assets/Group 57.svg';

export default function TopBar({ page, from, to, setFrom, setTo, onSwap, onBack }) {
  if (page === 'explain') {
    return <div className="topbar" />;
  }

  if (page === 'word') {
    return (
      <div className="topbar left">
        <button className="back-btn" aria-label="назад" onClick={onBack}>
          ←
        </button>
        <div className="title-only">Пояснення слова.</div>
      </div>
    );
  }

  return (
    <div className="topbar">
      <LanguagePicker value={from} onChange={setFrom} />
      <button className="swap-btn" aria-label="switch languages" onClick={onSwap}>
        <img src={swapIcon} alt="" />
      </button>
      <LanguagePicker value={to} onChange={setTo} />
    </div>
  );
}
