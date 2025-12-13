import React, { useState, useEffect, useMemo } from 'react';
import { Package, ShoppingCart, Archive, RefreshCw, Calendar, DollarSign, Layers, Plus, Edit, Trash2, X, Loader, Download, Search, AlertTriangle, TrendingDown as StockDown, Users } from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const JohnnyInventory = ({ currentUser }) => {
  // ==================== STATE DECLARATIONS ====================
  const [inventoryItems, setInventoryItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showStockMovementModal, setShowStockMovementModal] = useState(false);
  const [showInventoryCategoryModal, setShowInventoryCategoryModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [searchInventory, setSearchInventory] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState({
    category: 'all',
    status: 'all'
  });
  const [customInventoryCategories, setCustomInventoryCategories] = useState([]);
  const [newInventoryCategory, setNewInventoryCategory] = useState('');

  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    branch: '',
    address: '',
    manager: '',
    phone: '',
    email: '',
    status: 'active',
    assigned_user_id: ''
  });

  const [newTransfer, setNewTransfer] = useState({
    item_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: 0,
    transfer_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });

  const [transferDateFilter, setTransferDateFilter] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    sku: '',
    category: 'Raw Materials',
    equipment_category: '',
    quantity: 0,
    unit: 'kg',
    reorder_point: 0,
    unit_price: 0,
    supplier_id: '',
    warehouse_id: '',
    expiry_date: '',
    location: ''
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  const [newStockMovement, setNewStockMovement] = useState({
    item_id: '',
    movement_type: 'new',
    quantity: 0,
    reference_number: '',
    notes: ''
  });

  // ==================== CONSTANTS ====================
  const movementTypes = ['scrap', 'faulty', 'extra', 'new'];
  const inventoryCategories = ['Raw Materials', 'Ingredients', 'Packaging', 'Beverages', 'Sauces', 'Supplies', 'Equipment', ...customInventoryCategories];
  const units = ['kg', 'lbs', 'liters', 'pieces', 'boxes', 'bags', 'bottles'];
  
  const equipmentCategories = [
    'Laser Jet Printer',
    'Thermal Printer',
    'Mouse',
    'Keyboard',
    'LCD',
    'CPU',
    'Adapters',
    'Cameras',
    'WiFi Router',
    'Load Balancer',
    'Network Switch',
    'POE Switch',
    'PDU',
    'Patch Panel',
    'Cable Manager',
    'Cable Role',
    'VGA',
    'D-Port',
    'Patch Code',
    'Numpad',
    'SS Stand',
    'Access Control',
    'Access Control Magnet',
    'Attendance Machine',
    'HDMI',
    'NVR/DVR',
    'Printer Cartridge',
    'Cash Drawer',
    'Server',
    'Access Point'
  ];

  // ==================== UTILITY FUNCTIONS ====================
  const generateSKU = (category) => {
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const getInventoryStatus = (item) => {
    if (item.quantity <= 0) return { status: 'Out of Stock', color: 'red' };
    if (item.quantity <= item.reorder_point) return { status: 'Low Stock', color: 'yellow' };
    return { status: 'In Stock', color: 'green' };
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'Expired', color: 'red' };
    if (daysUntilExpiry <= 7) return { status: `Expires in ${daysUntilExpiry} days`, color: 'red' };
    if (daysUntilExpiry <= 30) return { status: `Expires in ${daysUntilExpiry} days`, color: 'yellow' };
    return { status: `Expires in ${daysUntilExpiry} days`, color: 'green' };
  };

  const getInventoryAnalytics = () => {
    const total = inventoryItems.length;
    const lowStock = inventoryItems.filter(i => i.quantity > 0 && i.quantity <= i.reorder_point).length;
    const outOfStock = inventoryItems.filter(i => i.quantity <= 0).length;
    const expiringSoon = inventoryItems.filter(i => {
      if (!i.expiry_date) return false;
      const daysUntil = Math.ceil((new Date(i.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30;
    }).length;
    
    const totalValue = inventoryItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
    
    return { total, lowStock, outOfStock, expiringSoon, totalValue };
  };

  // ==================== DATA LOADING FUNCTIONS ====================
  useEffect(() => {
    loadInventory();
    loadSuppliers();
    loadStockMovements();
    loadInventoryCategories();
    loadWarehouses();
    if (currentUser?.role === 'admin') {
      loadUsers();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('inventory_items')
        .select('*, suppliers(name), warehouses(name, branch)');
      
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'support') {
        if (!currentUser?.warehouse_id) {
          console.warn('User has no warehouse_id assigned:', currentUser);
          setInventoryItems([]);
          setLoading(false);
          return;
        }
        query = query.eq('warehouse_id', currentUser.warehouse_id);
      } else if (selectedWarehouse && selectedWarehouse !== 'all') {
        query = query.eq('warehouse_id', selectedWarehouse);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      
      if (error) throw error;
      setInventoryItems(data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setWarehouses(data || []);
    } catch (err) {
      console.error('Error loading warehouses:', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  const loadStockMovements = async () => {
    try {
      let query = supabase
        .from('stock_movements')
        .select('*, inventory_items(name, sku)')
        .order('created_at', { ascending: false });
      
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'support' && currentUser?.warehouse_id) {
        query = query.or(`from_warehouse_id.eq.${currentUser.warehouse_id},to_warehouse_id.eq.${currentUser.warehouse_id}`);
      }
      
      if (transferDateFilter.startDate) {
        query = query.gte('created_at', transferDateFilter.startDate + 'T00:00:00');
      }
      if (transferDateFilter.endDate) {
        query = query.lte('created_at', transferDateFilter.endDate + 'T23:59:59');
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      setStockMovements(data || []);
    } catch (err) {
      console.error('Error loading stock movements:', err);
    }
  };

  const loadInventoryCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.log('Inventory categories table not found - using defaults only');
        return;
      }
      setCustomInventoryCategories(data?.map(cat => cat.name) || []);
    } catch (err) {
      console.error('Error loading inventory categories:', err);
    }
  };

  // ==================== WAREHOUSE HANDLERS ====================
  const handleAddWarehouse = async () => {
    if (!newWarehouse.name || !newWarehouse.branch) {
      setError('Warehouse name and branch are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (editingWarehouse) {
        const { error } = await supabase
          .from('warehouses')
          .update({
            name: newWarehouse.name,
            branch: newWarehouse.branch,
            address: newWarehouse.address,
            manager: newWarehouse.manager,
            phone: newWarehouse.phone,
            email: newWarehouse.email,
            status: newWarehouse.status,
            assigned_user_id: newWarehouse.assigned_user_id || null
          })
          .eq('id', editingWarehouse.id);
        
        if (error) throw error;
        
        if (newWarehouse.assigned_user_id) {
          const { error: userError } = await supabase
            .from('users')
            .update({ warehouse_id: editingWarehouse.id })
            .eq('id', newWarehouse.assigned_user_id);
          
          if (userError) console.error('Error updating user warehouse:', userError);
        }
      } else {
        const { data, error } = await supabase
          .from('warehouses')
          .insert([{
            ...newWarehouse,
            created_by: currentUser?.username,
            assigned_user_id: newWarehouse.assigned_user_id || null
          }])
          .select();
        
        if (error) throw error;
        
        if (newWarehouse.assigned_user_id && data && data[0]) {
          const { error: userError } = await supabase
            .from('users')
            .update({ warehouse_id: data[0].id })
            .eq('id', newWarehouse.assigned_user_id);
          
          if (userError) console.error('Error updating user warehouse:', userError);
        }
      }
      
      await loadWarehouses();
      await loadUsers();
      setNewWarehouse({
        name: '',
        branch: '',
        address: '',
        manager: '',
        phone: '',
        email: '',
        status: 'active',
        assigned_user_id: ''
      });
      setEditingWarehouse(null);
      setShowWarehouseModal(false);
    } catch (err) {
      console.error('Error saving warehouse:', err);
      setError('Failed to save warehouse');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    if (!window.confirm('Are you sure? This will affect all inventory items in this warehouse.')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouseId);
      
      if (error) throw error;
      await loadWarehouses();
      await loadInventory();
    } catch (err) {
      console.error('Error deleting warehouse:', err);
      setError('Failed to delete warehouse. Items may still be assigned to it.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== TRANSFER HANDLER ====================
  const handleTransferItem = async () => {
    if (!newTransfer.item_id || !newTransfer.from_warehouse_id || !newTransfer.to_warehouse_id || !newTransfer.quantity) {
      setError('Please fill in all required fields');
      return;
    }

    if (newTransfer.from_warehouse_id === newTransfer.to_warehouse_id) {
      setError('Cannot transfer to the same warehouse');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { data: sourceItem, error: sourceError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', newTransfer.item_id)
        .eq('warehouse_id', newTransfer.from_warehouse_id)
        .single();
      
      if (sourceError || !sourceItem) {
        throw new Error('Source item not found');
      }

      if (sourceItem.quantity < parseFloat(newTransfer.quantity)) {
        setError('Insufficient quantity in source warehouse');
        setLoading(false);
        return;
      }

      const { error: updateSourceError } = await supabase
        .from('inventory_items')
        .update({ 
          quantity: sourceItem.quantity - parseFloat(newTransfer.quantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', newTransfer.item_id);
      
      if (updateSourceError) throw updateSourceError;

      const { data: destItem } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('sku', sourceItem.sku)
        .eq('warehouse_id', newTransfer.to_warehouse_id)
        .single();

      if (destItem) {
        const { error: updateDestError } = await supabase
          .from('inventory_items')
          .update({ 
            quantity: destItem.quantity + parseFloat(newTransfer.quantity),
            updated_at: new Date().toISOString()
          })
          .eq('id', destItem.id);
        
        if (updateDestError) throw updateDestError;
      } else {
        const { error: insertDestError } = await supabase
          .from('inventory_items')
          .insert([{
            name: sourceItem.name,
            sku: sourceItem.sku,
            category: sourceItem.category,
            quantity: parseFloat(newTransfer.quantity),
            unit: sourceItem.unit,
            reorder_point: sourceItem.reorder_point,
            unit_price: sourceItem.unit_price,
            supplier_id: sourceItem.supplier_id,
            warehouse_id: newTransfer.to_warehouse_id,
            expiry_date: sourceItem.expiry_date,
            created_by: currentUser?.username
          }]);
        
        if (insertDestError) throw insertDestError;
      }

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          item_id: newTransfer.item_id,
          movement_type: 'transfer',
          quantity: parseFloat(newTransfer.quantity),
          from_warehouse_id: newTransfer.from_warehouse_id,
          to_warehouse_id: newTransfer.to_warehouse_id,
          reference_number: newTransfer.reference_number,
          notes: newTransfer.notes,
          created_by: currentUser?.username
        }]);
      
      if (movementError) throw movementError;
      
      await loadInventory();
      await loadStockMovements();
      setNewTransfer({
        item_id: '',
        from_warehouse_id: '',
        to_warehouse_id: '',
        quantity: 0,
        transfer_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: ''
      });
      setShowTransferModal(false);
      alert('Transfer completed successfully!');
    } catch (err) {
      console.error('Error transferring item:', err);
      setError('Failed to transfer item: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== INVENTORY ITEM HANDLERS ====================
  const handleAddInventoryCategory = async () => {
    if (!newInventoryCategory.trim()) {
      setError('Category name is required');
      return;
    }

    if (inventoryCategories.includes(newInventoryCategory.trim())) {
      setError('Category already exists');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('inventory_categories')
        .insert([{ name: newInventoryCategory.trim() }]);
      
      if (error) throw error;
      
      await loadInventoryCategories();
      setNewInventoryCategory('');
      setShowInventoryCategoryModal(false);
    } catch (err) {
      console.error('Error adding inventory category:', err);
      setError('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInventoryCategory = async (categoryName) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('name', categoryName);
      
      if (error) throw error;
      await loadInventoryCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventoryItem = async () => {
    if (!newInventoryItem.name || !newInventoryItem.category || !newInventoryItem.warehouse_id) {
      setError('Please fill in required fields including warehouse');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const itemData = {
        ...newInventoryItem,
        sku: newInventoryItem.sku || generateSKU(newInventoryItem.category),
        created_by: currentUser?.username
      };

      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert([itemData]);
        
        if (error) throw error;
      }
      
      await loadInventory();
      setNewInventoryItem({
        name: '',
        sku: '',
        category: 'Raw Materials',
        equipment_category: '',
        quantity: 0,
        unit: 'kg',
        reorder_point: 0,
        unit_price: 0,
        supplier_id: '',
        warehouse_id: '',
        expiry_date: ''
      });
      setEditingItem(null);
      setShowInventoryModal(false);
    } catch (err) {
      console.error('Error saving inventory item:', err);
      setError('Failed to save inventory item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInventoryItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      await loadInventory();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  // ==================== SUPPLIER HANDLERS ====================
  const handleAddSupplier = async () => {
    if (!newSupplier.name) {
      setError('Supplier name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('suppliers')
        .insert([newSupplier]);
      
      if (error) throw error;
      
      await loadSuppliers();
      setNewSupplier({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
      });
      setShowSupplierModal(false);
    } catch (err) {
      console.error('Error adding supplier:', err);
      setError('Failed to add supplier');
    } finally {
      setLoading(false);
    }
  };

  // ==================== STOCK MOVEMENT HANDLERS ====================
  const handleAddStockMovement = async () => {
    if (!newStockMovement.item_id || !newStockMovement.quantity) {
      setError('Please select an item and enter quantity');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          ...newStockMovement,
          created_by: currentUser?.username
        }]);
      
      if (movementError) throw movementError;

      const item = inventoryItems.find(i => i.id === parseInt(newStockMovement.item_id));
      const quantityChange = newStockMovement.movement_type === 'receipt' || newStockMovement.movement_type === 'return'
        ? parseInt(newStockMovement.quantity)
        : -parseInt(newStockMovement.quantity);
      
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity: item.quantity + quantityChange })
        .eq('id', parseInt(newStockMovement.item_id));
      
      if (updateError) throw updateError;
      
      await loadInventory();
      await loadStockMovements();
      setNewStockMovement({
        item_id: '',
        movement_type: 'receipt',
        quantity: 0,
        reference_number: '',
        notes: ''
      });
      setShowStockMovementModal(false);
    } catch (err) {
      console.error('Error adding stock movement:', err);
      setError('Failed to add stock movement');
    } finally {
      setLoading(false);
    }
  };

  // ==================== EXPORT FUNCTIONS ====================
  const exportInventoryToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(inventoryItems.map(i => ({
      SKU: i.sku,
      Name: i.name,
      Category: i.category,
      Quantity: i.quantity,
      Unit: i.unit,
      'Unit Price': i.unit_price,
      'Total Value': (i.quantity * i.unit_price).toFixed(2),
      'Reorder Point': i.reorder_point,
      Location: i.location,
      'Expiry Date': i.expiry_date || 'N/A',
      Status: getInventoryStatus(i).status
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `JJ_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportTransfersToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Johnny & Jugnu - Stock Movements Report', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Date Range: ${transferDateFilter.startDate} to ${transferDateFilter.endDate}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
    doc.text(`Total Movements: ${stockMovements.length}`, 14, 44);
    
    const tableData = stockMovements.map(m => [
      new Date(m.created_at).toLocaleDateString(),
      m.movement_type,
      m.inventory_items?.name || 'N/A',
      m.inventory_items?.sku || 'N/A',
      m.quantity.toString(),
      warehouses.find(w => w.id === m.from_warehouse_id)?.name || '-',
      warehouses.find(w => w.id === m.to_warehouse_id)?.name || '-',
      m.reference_number || '-'
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Type', 'Item', 'SKU', 'Qty', 'From', 'To', 'Ref #']],
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    doc.save(`JJ_Transfers_${transferDateFilter.startDate}_to_${transferDateFilter.endDate}.pdf`);
  };

  // ==================== FILTERED DATA ====================
  const filteredInventory = useMemo(() => {
  return inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchInventory.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchInventory.toLowerCase());
    const matchesCategory = inventoryFilter.category === 'all' || item.category === inventoryFilter.category;
    
    let matchesStatus = true;
    if (inventoryFilter.status !== 'all') {
      const status = getInventoryStatus(item).status;
      matchesStatus = status.toLowerCase().includes(inventoryFilter.status);
    }
    
    return matchesSearch && matchesCategory && matchesStatus;
  });
}, [inventoryItems, searchInventory, inventoryFilter]);

const inventoryAnalytics = useMemo(() => getInventoryAnalytics(), [inventoryItems]);

  // ==================== RENDER ====================
  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg relative">
          <span className="block sm:inline">{error}</span>
          <button onClick={() => setError('')} className="absolute top-0 bottom-0 right-0 px-4">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* INVENTORY HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            {(currentUser?.role === 'admin' || currentUser?.role === 'support')
              ? `Managing ${selectedWarehouse === 'all' ? 'all warehouses' : warehouses.find(w => w.id === parseInt(selectedWarehouse))?.name || 'warehouse'}` 
              : `Warehouse: ${warehouses.find(w => w.id === currentUser?.warehouse_id)?.name || 'N/A'}`
            }
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(currentUser?.role === 'admin' || currentUser?.role === 'support') && (
            <>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    setShowWarehouseModal(true);
                    setEditingWarehouse(null);
                    setNewWarehouse({
                      name: '',
                      branch: '',
                      address: '',
                      manager: '',
                      phone: '',
                      email: '',
                      status: 'active',
                      assigned_user_id: ''
                    });
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Warehouses
                </button>
              )}
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Transfer
              </button>
            </>
          )}
          <button
            onClick={() => {
              setShowStockMovementModal(true);
              setNewStockMovement({
                item_id: '',
                movement_type: 'new',
                quantity: 0,
                reference_number: '',
                notes: ''
              });
            }}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition flex items-center"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Stock Movement
          </button>
          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => setShowInventoryCategoryModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
              >
                <Layers className="w-4 h-4 mr-2" />
                Asset Type
              </button>
              <button
                onClick={() => setShowSupplierModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <Users className="w-4 h-4 mr-2" />
                Suppliers
              </button>
              <button
                onClick={() => {
                  setShowInventoryModal(true);
                  setEditingItem(null);
                  setNewInventoryItem({
                    name: '',
                    sku: '',
                    category: 'Raw Materials',
                    equipment_category: '',
                    quantity: 0,
                    unit: 'kg',
                    reorder_point: 0,
                    unit_price: 0,
                    supplier_id: '',
                    warehouse_id: '',
                    expiry_date: ''
                  });
                }}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
              <button
                onClick={exportInventoryToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* INVENTORY OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm">Total Items</p>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{inventoryAnalytics.total}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm">Low Stock</p>
            <StockDown className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{inventoryAnalytics.lowStock}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm">Out of Stock</p>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{inventoryAnalytics.outOfStock}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm">Expiring Soon</p>
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{inventoryAnalytics.expiringSoon}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm">Total Value</p>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            Rs {inventoryAnalytics.totalValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTER */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {(currentUser?.role === 'admin' || currentUser?.role === 'support') && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Archive className="inline w-4 h-4 mr-1" />
                Warehouse/Branch
              </label>
              <select
                value={selectedWarehouse}
                onChange={(e) => {
                  setSelectedWarehouse(e.target.value);
                  loadInventory();
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="all">All Warehouses</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} - {warehouse.branch}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchInventory}
              onChange={(e) => setSearchInventory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Search by name or SKU..."
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type</label>
            <select
              value={inventoryFilter.category}
              onChange={(e) => setInventoryFilter({...inventoryFilter, category: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="all">All Asset Types</option>
              {inventoryCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={inventoryFilter.status}
              onChange={(e) => setInventoryFilter({...inventoryFilter, status: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="stock">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={loadInventory}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition shadow-md"
            >
              <Search className="inline-block w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="animate-spin w-8 h-8 text-orange-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Equipment Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Value</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Expiry</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Warehouse</th>
                  {currentUser?.role === 'admin' && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const status = getInventoryStatus(item);
                  const expiryStatus = getExpiryStatus(item.expiry_date);
                  
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.equipment_category || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="font-semibold">{item.quantity}</span> {item.unit}
                        {item.quantity <= item.reorder_point && (
                          <div className="text-xs text-orange-600 mt-1">
                            Reorder: {item.reorder_point} {item.unit}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">Rs {item.unit_price}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        Rs {(item.quantity * item.unit_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          status.color === 'red' ? 'bg-red-100 text-red-700' :
                          status.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {status.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {expiryStatus ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            expiryStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                            expiryStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {expiryStatus.status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700 font-medium">
                          {item.warehouses?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.warehouses?.branch}
                        </div>
                      </td>
                      {currentUser?.role === 'admin' && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setNewInventoryItem(item);
                              setShowInventoryModal(true);
                            }}
                            className="text-orange-600 hover:text-orange-800 mr-3"
                          >
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteInventoryItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT STOCK MOVEMENTS */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Stock Movements & Transfers</h3>
          <button
            onClick={exportTransfersToPDF}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>

        {/* Date Filter */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={transferDateFilter.startDate}
              onChange={(e) => setTransferDateFilter({...transferDateFilter, startDate: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={transferDateFilter.endDate}
              onChange={(e) => setTransferDateFilter({...transferDateFilter, endDate: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadStockMovements}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center"
            >
              <Search className="w-4 h-4 mr-2" />
              Apply Filter
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Showing {stockMovements.length} movements from {transferDateFilter.startDate} to {transferDateFilter.endDate}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created By</th>
              </tr>
            </thead>
            <tbody>
              {stockMovements.slice(0, 10).map((movement) => (
                <tr key={movement.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(movement.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {movement.inventory_items?.name}
                    <div className="text-xs text-gray-500">{movement.inventory_items?.sku}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                      movement.movement_type === 'scrap' ? 'bg-red-100 text-red-700' :
                      movement.movement_type === 'faulty' ? 'bg-orange-100 text-orange-700' :
                      movement.movement_type === 'extra' ? 'bg-green-100 text-green-700' :
                      movement.movement_type === 'new' ? 'bg-blue-100 text-blue-700' :
                      movement.movement_type === 'transfer' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {movement.movement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                    {movement.movement_type === 'extra' || movement.movement_type === 'new' ? '+' : '-'}
                    {movement.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{movement.reference_number || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{movement.notes || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{movement.created_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

  {/* ALL MODALS */}
      
      {/* INVENTORY ITEM MODAL */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              <button
                onClick={() => {
                  setShowInventoryModal(false);
                  setEditingItem(null);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                <input
                  type="text"
                  value={newInventoryItem.name}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter item name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                <input
                  type="text"
                  value={newInventoryItem.sku}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, sku: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type *</label>
                <select
                  value={newInventoryItem.category}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  {inventoryCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {newInventoryItem.category === 'Equipment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Category *</label>
                  <select
                    value={newInventoryItem.equipment_category}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, equipment_category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="">Select Equipment Category</option>
                    {equipmentCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                <input
                  type="number"
                  value={newInventoryItem.quantity}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, quantity: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                <select
                  value={newInventoryItem.unit}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, unit: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Point *</label>
                <input
                  type="number"
                  value={newInventoryItem.reorder_point}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, reorder_point: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (Rs) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInventoryItem.unit_price}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, unit_price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                <select
                  value={newInventoryItem.supplier_id}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, supplier_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                <input
                  type="date"
                  value={newInventoryItem.expiry_date}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, expiry_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse/Branch *</label>
                <select
                  value={newInventoryItem.warehouse_id}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, warehouse_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.filter(w => w.status === 'active').map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInventoryModal(false);
                  setEditingItem(null);
                  setError('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddInventoryItem}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition flex items-center justify-center"
              >
                {loading ? (
                  <Loader className="animate-spin w-5 h-5" />
                ) : (
                  `${editingItem ? 'Update' : 'Add'} Item`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Add New Supplier</h3>
              <button
                onClick={() => {
                  setShowSupplierModal(false);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name *</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                <input
                  type="text"
                  value={newSupplier.contact_person}
                  onChange={(e) => setNewSupplier({...newSupplier, contact_person: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter contact person"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-20 resize-none"
                  placeholder="Enter address"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSupplierModal(false);
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition flex items-center justify-center"
                >
                  {loading ? (
                    <Loader className="animate-spin w-5 h-5" />
                  ) : (
                    'Add Supplier'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STOCK MOVEMENT MODAL */}
      {showStockMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Record Stock Movement</h3>
              <button
                onClick={() => {
                  setShowStockMovementModal(false);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Item *</label>
                <select
                  value={newStockMovement.item_id}
                  onChange={(e) => setNewStockMovement({...newStockMovement, item_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">Select an item</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku}) - Current: {item.quantity} {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type *</label>
                <select
                  value={newStockMovement.movement_type}
                  onChange={(e) => setNewStockMovement({...newStockMovement, movement_type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="scrap">Scrap</option>
                  <option value="faulty">Faulty</option>
                  <option value="extra">Extra</option>
                  <option value="new">New</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                <input
                  type="number"
                  value={newStockMovement.quantity}
                  onChange={(e) => setNewStockMovement({...newStockMovement, quantity: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={newStockMovement.reference_number}
                  onChange={(e) => setNewStockMovement({...newStockMovement, reference_number: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="PO#, Invoice#, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newStockMovement.notes}
                  onChange={(e) => setNewStockMovement({...newStockMovement, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-20 resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowStockMovementModal(false);
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStockMovement}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition flex items-center justify-center"
                >
                  {loading ? (
                    <Loader className="animate-spin w-5 h-5" />
                  ) : (
                    'Record Movement'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WAREHOUSE MANAGEMENT MODAL */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                <Archive className="inline w-5 h-5 mr-2" />
                Warehouse / Branch Management
              </h3>
              <button
                onClick={() => {
                  setShowWarehouseModal(false);
                  setEditingWarehouse(null);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Add/Edit Warehouse Form */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse/Branch'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Name *</label>
                  <input
                    type="text"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g., Main Warehouse, Central Storage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name *</label>
                  <input
                    type="text"
                    value={newWarehouse.branch}
                    onChange={(e) => setNewWarehouse({...newWarehouse, branch: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g., Johar Town, DHA, Gulberg"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={newWarehouse.address}
                    onChange={(e) => setNewWarehouse({...newWarehouse, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Full address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                  <input
                    type="text"
                    value={newWarehouse.manager}
                    onChange={(e) => setNewWarehouse({...newWarehouse, manager: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Manager name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newWarehouse.phone}
                    onChange={(e) => setNewWarehouse({...newWarehouse, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="+92-XXX-XXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newWarehouse.email}
                    onChange={(e) => setNewWarehouse({...newWarehouse, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="warehouse@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={newWarehouse.status}
                    onChange={(e) => setNewWarehouse({...newWarehouse, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned User</label>
                  <select
                    value={newWarehouse.assigned_user_id || ''}
                    onChange={(e) => setNewWarehouse({...newWarehouse, assigned_user_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Select User --</option>
                    {users.filter(u => u.role !== 'admin').map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.role}) - {user.branch}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">User assigned to manage this warehouse</p>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setEditingWarehouse(null);
                    setNewWarehouse({
                      name: '',
                      branch: '',
                      address: '',
                      manager: '',
                      phone: '',
                      email: '',
                      status: 'active',
                      assigned_user_id: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Clear
                </button>
                <button
                  onClick={handleAddWarehouse}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center"
                >
                  {loading ? (
                    <Loader className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {editingWarehouse ? 'Update' : 'Add'} Warehouse
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Warehouses List */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-4">
                Existing Warehouses ({warehouses.length})
              </h4>
              {warehouses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No warehouses yet. Add one above!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-semibold text-gray-800 text-lg">{warehouse.name}</h5>
                          <p className="text-sm text-indigo-600 font-medium">{warehouse.branch}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          warehouse.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {warehouse.status}
                        </span>
                      </div>
                      
                      {warehouse.address && (
                        <p className="text-sm text-gray-600 mb-2">📍 {warehouse.address}</p>
                      )}
                      
                      {warehouse.manager && (
                        <p className="text-sm text-gray-600 mb-1">👤 {warehouse.manager}</p>
                      )}
                      
                      {warehouse.phone && (
                        <p className="text-sm text-gray-600 mb-1">📞 {warehouse.phone}</p>
                      )}
                      
                      {warehouse.email && (
                        <p className="text-sm text-gray-600 mb-3">✉️ {warehouse.email}</p>
                      )}
                      
                      {warehouse.assigned_user_id && (
                        <p className="text-sm font-medium text-purple-600 mb-2">
                          🔗 Assigned: {users.find(u => u.id === warehouse.assigned_user_id)?.username || 'User not found'}
                        </p>
                      )}
                      
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setEditingWarehouse(warehouse);
                            setNewWarehouse(warehouse);
                          }}
                          className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center text-sm"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteWarehouse(warehouse.id)}
                          className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center justify-center text-sm"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowWarehouseModal(false);
                  setEditingWarehouse(null);
                  setError('');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER ITEMS MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                <RefreshCw className="inline w-5 h-5 mr-2" />
                Transfer Items Between Warehouses
              </h3>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will move inventory from one warehouse to another. Make sure quantities are correct.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Item *</label>
                <select
                  value={newTransfer.item_id}
                  onChange={(e) => setNewTransfer({...newTransfer, item_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="">Select an item</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku}) - {item.warehouses?.name} - Qty: {item.quantity} {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Warehouse *</label>
                  <select
                    value={newTransfer.from_warehouse_id}
                    onChange={(e) => setNewTransfer({...newTransfer, from_warehouse_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="">Select source</option>
                    {warehouses.filter(w => w.status === 'active').map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} - {warehouse.branch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Warehouse *</label>
                  <select
                    value={newTransfer.to_warehouse_id}
                    onChange={(e) => setNewTransfer({...newTransfer, to_warehouse_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="">Select destination</option>
                    {warehouses.filter(w => w.status === 'active').map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} - {warehouse.branch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Transfer *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransfer.quantity}
                  onChange={(e) => setNewTransfer({...newTransfer, quantity: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Date</label>
                <input
                  type="date"
                  value={newTransfer.transfer_date}
                  onChange={(e) => setNewTransfer({...newTransfer, transfer_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={newTransfer.reference_number}
                  onChange={(e) => setNewTransfer({...newTransfer, reference_number: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Transfer ID, Document #, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newTransfer.notes}
                  onChange={(e) => setNewTransfer({...newTransfer, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none h-20 resize-none"
                  placeholder="Reason for transfer, additional details..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferItem}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center justify-center"
                >
                  {loading ? (
                    <Loader className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Complete Transfer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY CATEGORY MODAL */}
      {showInventoryCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Manage Asset Types</h3>
              <button
                onClick={() => {
                  setShowInventoryCategoryModal(false);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Add New Asset Type */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Asset Type</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInventoryCategory}
                  onChange={(e) => setNewInventoryCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddInventoryCategory()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Enter asset type (e.g., Frozen Items, Dairy Products)"
                  disabled={loading}
                />
                <button
                  onClick={handleAddInventoryCategory}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
                >
                  {loading ? (
                    <Loader className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Default Asset Types */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Default Asset Types (Built-in)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['Raw Materials', 'Ingredients', 'Packaging', 'Beverages', 'Sauces', 'Supplies', 'Equipment'].map((cat) => (
                  <div key={cat} className="border border-gray-300 bg-gray-100 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Layers className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700">{cat}</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Default</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Asset Types */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Custom Asset Types ({customInventoryCategories.length})
              </h4>
              {customInventoryCategories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No custom asset types yet. Add one above!</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {customInventoryCategories.map((cat) => (
                    <div key={cat} className="border border-purple-200 bg-purple-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <Layers className="w-4 h-4 text-purple-600 mr-2" />
                        <span className="text-sm text-gray-800">{cat}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteInventoryCategory(cat)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowInventoryCategoryModal(false);
                  setError('');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JohnnyInventory;