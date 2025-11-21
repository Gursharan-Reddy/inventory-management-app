import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HistorySidebar = ({ product, onClose, API_URL }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (product) {
            const fetchHistory = async () => {
                setLoading(true);
                try {
                    const response = await axios.get(`${API_URL}/${product.id}/history`);
                    setHistory(response.data);
                } catch (error) {
                    console.error('Error fetching history:', error);
                    setHistory([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }
    }, [product, API_URL]);

    if (!product) {
        return null;
    }

    return (
        <div className={`history-sidebar ${product ? 'open' : ''}`}>
            <div className="history-header">
                <h3>History for: {product.name}</h3>
                <button onClick={onClose}>Close</button>
            </div>
            <div className="history-content">
                {loading ? (
                    <p>Loading history...</p>
                ) : history.length === 0 ? (
                    <p>No inventory history found.</p>
                ) : (
                    <ul className="history-list">
                        {history.map((log) => (
                            <li key={log.id}>
                                <strong>Date:</strong> {new Date(log.change_date).toLocaleString()} <br/>
                                <strong>Change:</strong> {log.old_quantity} → {log.new_quantity} <br/>
                                <em>Changed By: {log.user_info || 'Admin'}</em>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default HistorySidebar;