// src/components/Sidebar.jsx
import React from 'react';
import './menu.css'; // On va créer ce fichier CSS
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faWrench, faUser, faEnvelope } from '@fortawesome/free-solid-svg-icons';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <a href="#home">
        <FontAwesomeIcon icon={faHome} className="fa-fw" /> Home
      </a>
      <a href="#services">
        <FontAwesomeIcon icon={faWrench} className="fa-fw" /> Services
      </a>
      <a href="#clients">
        <FontAwesomeIcon icon={faUser} className="fa-fw" /> Clients
      </a>
      <a href="#contact">
        <FontAwesomeIcon icon={faEnvelope} className="fa-fw" /> Contact
      </a>
    </div>
  );
};

export default Sidebar;