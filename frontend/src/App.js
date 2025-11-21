import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ProductTable from './components/ProductTable';
import HistorySidebar from './components/HistorySidebar';
import Header from './components/Header';
import AddProductModal from './components/AddProductModal';
import CustomDialog from './components/CustomDialog';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL;

function App() {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const [dialog, setDialog] = useState({ 
        isOpen: false, 
        message: '', 
        isConfirm: false, 
        onConfirm: null, 
        onClose: null 
    });

    const openAlert = (message) => {
        setDialog({ 
            isOpen: true, 
            message: message, 
            isConfirm: false, 
            onConfirm: null, 
            onClose: () => setDialog({ ...dialog, isOpen: false })
        });
    };

    const openConfirm = (message) => {
        return new Promise((resolve) => {
            const handleConfirm = () => {
                setDialog({ ...dialog, isOpen: false });
                resolve(true);
            };
            const handleCancel = () => {
                setDialog({ ...dialog, isOpen: false });
                resolve(false);
            };

            setDialog({
                isOpen: true,
                message: message,
                isConfirm: true,
                onConfirm: handleConfirm,
                onClose: handleCancel,
            });
        });
    };

    // fetchProducts relies on the dependency array of the surrounding useCallback
    const fetchProducts = useCallback(async () => {
        try {
            let url = API_URL;
            const params = {};
            if (searchQuery) params.name = searchQuery;
            if (selectedCategory) params.category = selectedCategory;

            const response = await axios.get(url, { params });
            setProducts(response.data);

            const uniqueCategories = [...new Set(response.data.map(p => p.category).filter(Boolean))];
            setCategories(uniqueCategories);

        } catch (error) {
            console.error('Error fetching products:', error);
            openAlert('Failed to fetch products. Check console for details.');
        }
    }, [searchQuery, selectedCategory, openAlert]); 
    // ^ openAlert must be here to clear the ESlint warning, but it doesn't cause the loop.

    useEffect(() => {
        if (API_URL) {
            fetchProducts();
        } else {
            console.error("REACT_APP_API_URL is not set in environment variables.");
        }
    // FIX: The dependencies that trigger the fetch are now placed here directly,
    // ensuring fetchProducts is only called when its dependencies actually change.
    }, [searchQuery, selectedCategory, fetchProducts]); 

    const handleImportSuccess = () => {
        openAlert('Products imported successfully! Table refreshing.');
        fetchProducts();
    };

    const handleAddProductSuccess = (newProduct) => {
        setIsAddModalOpen(false);
        setProducts(prevProducts => [...prevProducts, newProduct]);
        openAlert(`Product "${newProduct.name}" added successfully.`);
        fetchProducts();
    };

    const handleOptimisticUpdate = (updatedProduct) => {
        setProducts(prevProducts =>
            prevProducts.map(p => (p.id === updatedProduct.id ? updatedProduct : p))
        );
        if (selectedProduct && selectedProduct.id === updatedProduct.id) {
            setSelectedProduct(updatedProduct);
        }
    };
    
    const handleOptimisticDelete = (deletedId) => {
        setProducts(prevProducts =>
            prevProducts.filter(p => p.id !== deletedId)
        );
        if (selectedProduct && selectedProduct.id === deletedId) {
            setSelectedProduct(null);
        }
    };

    const handleExport = async () => {
        try {
            const response = await axios.get(`${API_URL}/export`, { responseType: 'blob' });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'products.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            
        } catch (error) {
            console.error('Error exporting products:', error);
            openAlert('Error exporting products. Check console for details.');
        }
    };
    
    return (
        <div className="app-container">
            <Header 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categories={categories}
                onImportSuccess={handleImportSuccess}
                onExport={handleExport}
                onAddClick={() => setIsAddModalOpen(true)}
                openAlert={openAlert}
                API_URL={API_URL}
            />
            <main className="main-content">
                <ProductTable 
                    products={products} 
                    onOptimisticUpdate={handleOptimisticUpdate}
                    onOptimisticDelete={handleOptimisticDelete}
                    onRowClick={setSelectedProduct}
                    openConfirm={openConfirm}
                    openAlert={openAlert}
                    API_URL={API_URL}
                />
            </main>

            <HistorySidebar 
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                API_URL={API_URL}
            />

            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleAddProductSuccess}
                API_URL={API_URL}
                openAlert={openAlert}
            />

            <CustomDialog 
                isOpen={dialog.isOpen} 
                message={dialog.message} 
                isConfirm={dialog.isConfirm} 
                onConfirm={dialog.onConfirm} 
                onClose={dialog.onClose} 
            />
        </div>
    );
}

export default App;