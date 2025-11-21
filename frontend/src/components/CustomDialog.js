import React from 'react';

const CustomDialog = ({ isOpen, message, isConfirm, onConfirm, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="dialog-backdrop">
            <div className="dialog-modal">
                <p className="dialog-message">{message}</p>
                <div className="dialog-actions">
                    {isConfirm && (
                        <button onClick={onClose} className="btn-cancel">Cancel</button>
                    )}
                    <button onClick={isConfirm ? onConfirm : onClose} className="btn-confirm">
                        {isConfirm ? 'Confirm' : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomDialog;