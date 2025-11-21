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

    // FIX 1: Memoize openAlert to prevent recreation on every render
    const openAlert = useCallback((message) => {
        setDialog({ 
            isOpen: true, 
            message: message, 
            isConfirm: false, 
            onConfirm: null, 
            onClose: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
    }, [setDialog]); // setDialog is stable, so openAlert is stable

    // FIX 2: Memoize openConfirm to prevent recreation on every render
    const openConfirm = useCallback((message) => {
        return new Promise((resolve) => {
            const handleConfirm = () => {
                setDialog(prev => ({ ...prev, isOpen: false }));
                resolve(true);
            };
            const handleCancel = () => {
                setDialog(prev => ({ ...prev, isOpen: false }));
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
    }, [setDialog]); // setDialog is stable, so openConfirm is stable


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
    // Now that openAlert is stable, this dependency array is clean
    }, [searchQuery, selectedCategory, openAlert]); 

    useEffect(() => {
        if (API_URL) {
            fetchProducts();
        } else {
            console.error("REACT_APP_API_URL is not set in environment variables.");
        }
    // This dependency array now relies only on state that changes due to user input/filter, 
    // ensuring the fetch only runs when filtering happens, or once on mount.
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