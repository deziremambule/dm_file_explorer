import React from 'react';
import Modal from 'react-modal';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmationModal = ({ 
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="confirmation-modal"
      overlayClassName="confirmation-overlay"
    >
      <div className="modal-header">
        <FiAlertTriangle className="warning-icon" />
        <h3>{title}</h3>
      </div>
      <div className="modal-content">
        <p>{message}</p>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="cancel-button">
          Cancel
        </button>
        <button onClick={onConfirm} className="confirm-button">
          Confirm
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;