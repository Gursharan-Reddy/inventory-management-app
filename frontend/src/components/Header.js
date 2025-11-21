import React, { useRef } from 'react';
import axios from 'axios';

const Header = ({ searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, categories, onImportSuccess, onExport, onAddClick, openAlert, API_URL }) => {
    const fileInputRef = useRef(null);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('csvFile', file);

        try {
            const response = await axios.post(`${API_URL}/import`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log(response.data);
            onImportSuccess();
            openAlert(`Import complete. Added: ${response.data.added}, Skipped: ${response.data.skipped} (duplicates).`);
        } catch (error) {
            console.error('Import error:', error);
            openAlert('Import failed. Check console for details.');
        } finally {
            event.target.value = null;
        }
    };

    return (
        <header className="app-header">
            <h2>📦 Inventory Management</h2>
            <div className="controls">
                <button onClick={onAddClick} className="btn-primary">Add New Product</button>

                <input 
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <button onClick={() => fileInputRef.current.click()} className="btn-secondary">Import CSV</button>
                <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    style={{ display: 'none' }} 
                />

                <button onClick={onExport} className="btn-secondary">Export CSV</button>
            </div>
        </header>
    );
};

export default Header;