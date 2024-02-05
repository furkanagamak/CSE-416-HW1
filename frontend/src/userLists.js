import React from 'react';
import './userLists.css';

const ListBoxContainer = () => {
  return (
    <div className="list-box-container">
      <div>
        <label className="list-label">Confirmed In</label>
        <textarea className="text-area"></textarea>
      </div>
      <div>
        <label className="list-label">Confirmed Out</label>
        <textarea className="list-text-area"></textarea>
      </div>
      <div>
        <label className="list-label">Candidates</label>
        <textarea className="list-text-area"></textarea>
      </div>
    </div>
  );
}

export default ListBoxContainer;