import React, { useState } from 'react';
import axios from 'axios';

const AddProductModal = ({ isOpen, onClose, onSuccess, API_URL, openAlert }) => {
    const [formData, setFormData] = useState({
        name: '',
        unit: '',
        category: '',
        brand: '',
        stock: 0,
        image: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'stock' ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(API_URL, formData);
            onSuccess(response.data);
            setFormData({ name: '', unit: '', category: '', brand: '', stock: 0, image: '' }); // Reset form
        } catch (error) {
            console.error('Add product failed:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to add product.';
            openAlert(`Error: ${errorMsg}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="dialog-backdrop">
            <div className="dialog-modal add-modal">
                <h3>Add New Product</h3>
                <form onSubmit={handleSubmit}>
                    <label>Name (Unique):</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                    
                    <label>Stock:</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0" required />

                    <label>Category:</label>
                    <input type="text" name="category" value={formData.category} onChange={handleChange} />

                    <label>Brand:</label>
                    <input type="text" name="brand" value={formData.brand} onChange={handleChange} />
                    
                    <label>Unit:</label>
                    <input type="text" name="unit" value={formData.unit} onChange={handleChange} />

                    <label>Image URL (Optional):</label>
                    <input type="text" name="image" value={formData.image} onChange={handleChange} />

                    <div className="dialog-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
                        <button type="submit" className="btn-confirm">Add Product</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductModal;