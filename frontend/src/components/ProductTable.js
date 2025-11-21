import React, { useState } from 'react';
import axios from 'axios';

const ProductTable = ({ products, onOptimisticUpdate, onOptimisticDelete, onRowClick, openConfirm, openAlert, API_URL }) => {
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    const startEdit = (product) => {
        setEditingId(product.id);
        setEditData(product);
    };

    const handleSave = async (id) => {
        onOptimisticUpdate(editData);
        setEditingId(null);

        try {
            const response = await axios.put(`${API_URL}/${id}`, editData);
            console.log('Update successful:', response.data);
        } catch (error) {
            console.error('Update failed:', error);
            openAlert('Update failed: Reverting changes and refreshing table. ' + (error.response?.data?.errors?.[0]?.msg || error.message));
            window.location.reload(); 
        }
    };

    const handleDelete = async (id, name) => {
        const confirmed = await openConfirm(`Are you sure you want to delete product: ${name}?`);
        if (!confirmed) {
            return;
        }

        onOptimisticDelete(id);

        try {
            await axios.delete(`${API_URL}/${id}`);
            openAlert(`${name} deleted successfully.`);
        } catch (error) {
            console.error('Delete failed:', error);
            openAlert('Delete failed. Please refresh the page. ' + error.message);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const getStatusDisplay = (stock) => {
        const status = stock === 0 ? 'Out of Stock' : 'In Stock';
        const color = stock === 0 ? 'var(--color-red)' : 'var(--color-green)';
        return <span style={{ color: color, fontWeight: 'bold' }}>{status}</span>;
    };
    
    return (
        <table className="products-table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Unit</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {products.map((product) => (
                    <tr key={product.id} onClick={() => onRowClick(product)} className={editingId === product.id ? 'editing' : ''}>
                        <td className="image-cell">
                             <img 
                                src={product.image || 'https://placehold.co/50x50/cccccc/333333?text=N/A'} 
                                alt={product.name} 
                                className="product-thumb"
                                onError={(e) => e.target.src = 'https://placehold.co/50x50/cccccc/333333?text=N/A'}
                            />
                        </td>
                        <td>
                            {editingId === product.id ? 
                                <input type="text" name="name" value={editData.name || ''} onChange={handleInputChange} /> : 
                                product.name
                            }
                        </td>
                        <td>
                            {editingId === product.id ? 
                                <input type="text" name="unit" value={editData.unit || ''} onChange={handleInputChange} /> : 
                                product.unit
                            }
                        </td>
                        <td>
                            {editingId === product.id ? 
                                <input type="text" name="category" value={editData.category || ''} onChange={handleInputChange} /> : 
                                product.category
                            }
                        </td>
                        <td>
                            {editingId === product.id ? 
                                <input type="text" name="brand" value={editData.brand || ''} onChange={handleInputChange} /> : 
                                product.brand
                            }
                        </td>
                        <td>
                            {editingId === product.id ? 
                                <input type="number" name="stock" value={editData.stock || 0} onChange={handleInputChange} min="0" /> : 
                                product.stock
                            }
                        </td>
                        <td>{getStatusDisplay(product.stock)}</td>
                        <td className="actions-cell">
                            {editingId === product.id ? (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); handleSave(product.id); }} className="btn-save">Save</button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="btn-cancel">Cancel</button>
                                </>
                            ) : (
                                <>
                                <button onClick={(e) => { e.stopPropagation(); startEdit(product); }} className="btn-edit-action">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product.name); }} className="icon-btn delete-icon" title="Delete Product">
                                    🗑️
                                </button>
                                </>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ProductTable;