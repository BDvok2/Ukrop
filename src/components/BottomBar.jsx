import React from 'react';
import translateIcon from '../assets/translate.png';
import questionIcon from '../assets/question.png';
import userphoto from '../assets/userphoto.png';

export default function BottomBar({ page, onNav }) {
  return (
    <footer className="bottombar">
      <button className="nav-item nav-item--translate" onClick={() => onNav('translate')}>
        <img src={translateIcon} alt="" />
        <span>перекласти</span>
      </button>

      <div className="center-slot">
        <button className="avatar-btn">
          <img src={userphoto}  alt="" />
        </button>
        <span className="center-label">Вітаю, користувач!</span>
        
      </div>

      <button className="nav-item nav-item--explain" onClick={() => onNav('explain')}>
        <img src={questionIcon} alt="" />
        <span>пояснення</span>
      </button>
    </footer>
  );
}
