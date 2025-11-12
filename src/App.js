import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Search, Plus, Bell, FileText, BarChart3, Users, Tag, Edit, Trash2, X, Loader, Download, TrendingUp, TrendingDown, AlertTriangle, Hash, Package, ShoppingCart, TrendingDown as StockDown, Archive, RefreshCw, Calendar, DollarSign, Layers } from 'lucide-react';
import { supabase } from './supabaseClient';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const JohnnyCMS = () => {
  const [currentView, setCurrentView] = useState('welcome');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [searchComplaintNumber, setSearchComplaintNumber] = useState('');

  // Inventory States
  const [inventoryItems, setInventoryItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
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
    status: 'active'
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
    quantity: 0,
    unit: 'kg',
    reorder_point: 0,
    unit_price: 0,
    supplier_id: '',
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
    movement_type: 'receipt',
    quantity: 0,
    reference_number: '',
    notes: ''
  });

  const [newComplaint, setNewComplaint] = useState({
    department: 'IT',
    category: '',
    comments: '',
    priority: 'Medium',
    assigned_to: ''
  });

  const [filterData, setFilterData] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: 'all',
    priority: 'all'
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', role: 'user', branch: '' });
  const [newCategory, setNewCategory] = useState({ name: '', department: 'IT' });

  const inventoryCategories = ['Raw Materials', 'Ingredients', 'Packaging', 'Beverages', 'Sauces', 'Supplies', 'Equipment', ...customInventoryCategories];
  const units = ['kg', 'lbs', 'liters', 'pieces', 'boxes', 'bags', 'bottles'];

  // Generate unique complaint number in format: JJ-YYYYMMDD-XXXX
  const generateComplaintNumber = async () => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const prefix = `JJ-${dateStr}`;
      
      const { data, error } = await supabase
        .from('complaints')
        .select('complaint_number')
        .like('complaint_number', `${prefix}%`)
        .order('complaint_number', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      let sequenceNumber = 1;
      
      if (data && data.length > 0) {
        const lastNumber = data[0].complaint_number;
        const lastSequence = parseInt(lastNumber.split('-')[2]);
        sequenceNumber = lastSequence + 1;
      }
      
      const formattedSequence = sequenceNumber.toString().padStart(4, '0');
      return `${prefix}-${formattedSequence}`;
      
    } catch (err) {
      console.error('Error generating complaint number:', err);
      return `JJ-${Date.now()}`;
    }
  };

  // Generate SKU for inventory items
  const generateSKU = (category) => {
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadComplaints();
      loadCategories();
      loadInventory();
      loadSuppliers();
      loadStockMovements();
      loadInventoryCategories();
      loadWarehouses();
      if (currentUser?.role === 'admin') {
        loadUsers();
      }
    }
  }, [isLoggedIn, currentUser]);

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

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('department', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      setAllCategories(data || []);
      setCategories(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('inventory_items')
        .select('*, suppliers(name), warehouses(name, branch)');
      
      // Filter by warehouse/branch - Support and Admin see all
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'support') {
        query = query.eq('warehouse_id', currentUser?.warehouse_id);
      } else if (selectedWarehouse !== 'all') {
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
            status: newWarehouse.status
          })
          .eq('id', editingWarehouse.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('warehouses')
          .insert([{
            ...newWarehouse,
            created_by: currentUser?.username
          }]);
        
        if (error) throw error;
      }
      
      await loadWarehouses();
      setNewWarehouse({
        name: '',
        branch: '',
        address: '',
        manager: '',
        phone: '',
        email: '',
        status: 'active'
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
      
      // Get source item
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

      // Reduce quantity from source warehouse
      const { error: updateSourceError } = await supabase
        .from('inventory_items')
        .update({ 
          quantity: sourceItem.quantity - parseFloat(newTransfer.quantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', newTransfer.item_id);
      
      if (updateSourceError) throw updateSourceError;

      // Check if item exists in destination warehouse
      const { data: destItem, error: destCheckError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('sku', sourceItem.sku)
        .eq('warehouse_id', newTransfer.to_warehouse_id)
        .single();

      if (destItem) {
        // Update existing item in destination
        const { error: updateDestError } = await supabase
          .from('inventory_items')
          .update({ 
            quantity: destItem.quantity + parseFloat(newTransfer.quantity),
            updated_at: new Date().toISOString()
          })
          .eq('id', destItem.id);
        
        if (updateDestError) throw updateDestError;
      } else {
        // Create new item in destination
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

      // Record stock movement
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
      
      // Apply date filter if set
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
        // Table might not exist yet, that's okay
        console.log('Inventory categories table not found - using defaults only');
        return;
      }
      setCustomInventoryCategories(data?.map(cat => cat.name) || []);
    } catch (err) {
      console.error('Error loading inventory categories:', err);
    }
  };

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

      // Update inventory quantity
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

  const getCategoriesByDepartment = (department) => {
    return allCategories.filter(cat => cat.department === department);
  };

  const loadComplaints = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('complaints')
        .select('*');
      
      // Support and Admin see all branches, regular users see only their branch
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'support') {
        query = query.eq('branch', currentUser?.branch);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedComplaints = data?.map(c => ({
        ...c,
        priority: c.priority || 'Medium',
        date: new Date(c.created_at).toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true 
        })
      })) || [];
      
      const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
      formattedComplaints.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      setComplaints(formattedComplaints);
    } catch (err) {
      console.error('Error loading complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      setError('Please enter username and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginData.username)
        .eq('password', loginData.password)
        .single();
      
      if (error || !data) {
        setError('Invalid username or password');
        return;
      }
      
      setCurrentUser(data);
      setIsLoggedIn(true);
      setCurrentView('analytics');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComplaint = async () => {
    if (!newComplaint.category || !newComplaint.comments) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const complaintNumber = await generateComplaintNumber();
      
      const { error } = await supabase
        .from('complaints')
        .insert([{
          complaint_number: complaintNumber,
          department: newComplaint.department,
          category: newComplaint.category,
          comments: newComplaint.comments,
          priority: newComplaint.priority,
          status: 'Open',
          branch: currentUser?.branch || 'Unknown',
          assigned_to: newComplaint.assigned_to || null,
          created_by: currentUser?.username || 'unknown'
        }])
        .select();
      
      if (error) throw error;
      
      await loadComplaints();
      setNewComplaint({ department: 'IT', category: '', comments: '', priority: 'Medium', assigned_to: '' });
      setCurrentView('dashboard');
      
      alert(`Complaint created successfully!\nComplaint Number: ${complaintNumber}`);
    } catch (err) {
      console.error('Error adding complaint:', err);
      setError('Failed to add complaint');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', complaintId);
      
      if (error) throw error;
      await loadComplaints();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  const handlePriorityChange = async (complaintId, newPriority) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', complaintId);
      
      if (error) throw error;
      await loadComplaints();
    } catch (err) {
      console.error('Error updating priority:', err);
      setError('Failed to update priority');
    }
  };

  const handleAssignmentChange = async (complaintId, assignedTo) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          assigned_to: assignedTo || null, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', complaintId);
      
      if (error) throw error;
      await loadComplaints();
    } catch (err) {
      console.error('Error updating assignment:', err);
      setError('Failed to update assignment');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.email) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update({
            username: newUser.username,
            password: newUser.password,
            email: newUser.email,
            role: newUser.role,
            branch: newUser.branch
          })
          .eq('id', editingUser.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('users')
          .insert([{
            username: newUser.username,
            password: newUser.password,
            email: newUser.email,
            role: newUser.role,
            branch: newUser.branch
          }]);
        
        if (error) throw error;
      }
      
      await loadUsers();
      setNewUser({ username: '', password: '', email: '', role: 'user', branch: '' });
      setEditingUser(null);
      setShowUserModal(false);
    } catch (err) {
      console.error('Error saving user:', err);
      setError('Failed to save user. Username might already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      await loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || allCategories.some(c => c.name === newCategory.name && c.department === newCategory.department)) {
      setError('Category already exists in this department or is empty');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategory.name, department: newCategory.department }]);
      
      if (error) throw error;
      await loadCategories();
      setNewCategory({ name: '', department: 'IT' });
      setShowCategoryModal(false);
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      await loadCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const searchByComplaintNumber = async () => {
    if (!searchComplaintNumber.trim()) {
      loadComplaints();
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('complaints')
        .select('*')
        .ilike('complaint_number', `%${searchComplaintNumber}%`);
      
      if (currentUser?.role !== 'admin') {
        query = query.eq('branch', currentUser?.branch);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedComplaints = data?.map(c => ({
        ...c,
        priority: c.priority || 'Medium',
        date: new Date(c.created_at).toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true 
        })
      })) || [];
      
      setComplaints(formattedComplaints);
      
      if (formattedComplaints.length === 0) {
        setError('No complaints found with that number');
      }
    } catch (err) {
      console.error('Error searching complaints:', err);
      setError('Failed to search complaints');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      'High': 'bg-red-100 text-red-700 border-red-300',
      'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'Low': 'bg-green-100 text-green-700 border-green-300'
    };
    return styles[priority] || styles['Medium'];
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'High') return <AlertTriangle className="w-3 h-3 inline mr-1" />;
    return null;
  };

  const getAnalyticsData = () => {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentComplaints = complaints.filter(c => new Date(c.created_at) >= lastWeek);
    const oldComplaints = complaints.filter(c => new Date(c.created_at) < lastWeek && new Date(c.created_at) >= lastMonth);

    const percentageChange = oldComplaints.length > 0 
      ? ((recentComplaints.length - oldComplaints.length) / oldComplaints.length * 100).toFixed(1)
      : 0;

    return {
      total: complaints.length,
      open: complaints.filter(c => c.status === 'Open').length,
      pending: complaints.filter(c => c.status === 'Pending').length,
      parking: complaints.filter(c => c.status === 'Parking').length,
      resolved: complaints.filter(c => c.status === 'Resolved').length,
      high: complaints.filter(c => c.priority === 'High').length,
      medium: complaints.filter(c => c.priority === 'Medium').length,
      low: complaints.filter(c => c.priority === 'Low').length,
      recentCount: recentComplaints.length,
      percentageChange: parseFloat(percentageChange)
    };
  };

  const getStatusChartData = () => {
    const stats = getAnalyticsData();
    return [
      { name: 'Open', value: stats.open, color: '#EAB308' },
      { name: 'Pending', value: stats.pending, color: '#3B82F6' },
      { name: 'Parking', value: stats.parking, color: '#A855F7' },
      { name: 'Resolved', value: stats.resolved, color: '#10B981' }
    ];
  };

  const getPriorityChartData = () => {
    const stats = getAnalyticsData();
    return [
      { name: 'High', value: stats.high, color: '#EF4444' },
      { name: 'Medium', value: stats.medium, color: '#EAB308' },
      { name: 'Low', value: stats.low, color: '#10B981' }
    ];
  };

  const getCategoryChartData = () => {
    const categoryCounts = {};
    complaints.forEach(c => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });
    
    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getWeeklyTrendData = () => {
    const days = 7;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayComplaints = complaints.filter(c => {
        const cDate = new Date(c.created_at);
        return cDate.toDateString() === date.toDateString();
      });
      
      data.push({
        date: dateStr,
        count: dayComplaints.length,
        resolved: dayComplaints.filter(c => c.status === 'Resolved').length,
        high: dayComplaints.filter(c => c.priority === 'High').length
      });
    }
    
    return data;
  };

  const getBranchPerformance = () => {
    if (currentUser?.role !== 'admin') {
      const branchComplaints = complaints.filter(c => c.branch === currentUser?.branch);
      const resolved = branchComplaints.filter(c => c.status === 'Resolved').length;
      const rate = branchComplaints.length > 0 
        ? ((resolved / branchComplaints.length) * 100).toFixed(1) 
        : '0';
      
      return [{
        branch: currentUser?.branch || 'My Branch',
        total: branchComplaints.length,
        resolved: resolved,
        rate: rate
      }];
    }
    
    const branchStats = {};
    complaints.forEach(c => {
      if (!branchStats[c.branch]) {
        branchStats[c.branch] = { total: 0, resolved: 0 };
      }
      branchStats[c.branch].total++;
      if (c.status === 'Resolved') {
        branchStats[c.branch].resolved++;
      }
    });
    
    return Object.entries(branchStats)
      .map(([branch, stats]) => ({
        branch,
        total: stats.total,
        resolved: stats.resolved,
        rate: ((stats.resolved / stats.total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.total - a.total);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(complaints.map(c => ({
      'Complaint Number': c.complaint_number,
      Date: c.date,
      Department: c.department,
      Category: c.category,
      Priority: c.priority,
      Comments: c.comments,
      Status: c.status,
      Branch: c.branch,
      'Created By': c.created_by
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
    XLSX.writeFile(wb, `JJ_Complaints_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

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

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Johnny & Jugnu - Complaints Report', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    const tableData = complaints.map(c => [
      c.complaint_number,
      c.date,
      c.department,
      c.category,
      c.priority,
      c.status,
      c.branch
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [['Complaint #', 'Date', 'Department', 'Category', 'Priority', 'Status', 'Branch']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234, 88, 12] }
    });
    
    doc.save(`JJ_Complaints_${new Date().toISOString().split('T')[0]}.pdf`);
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
    
    doc.autoTable({
      startY: 50,
      head: [['Date', 'Type', 'Item', 'SKU', 'Qty', 'From', 'To', 'Ref #']],
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    doc.save(`JJ_Transfers_${transferDateFilter.startDate}_to_${transferDateFilter.endDate}.pdf`);
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterData.status !== 'all' && c.status.toLowerCase() !== filterData.status) return false;
    if (filterData.priority !== 'all' && c.priority !== filterData.priority) return false;
    return true;
  });

  const filteredInventory = inventoryItems.filter(item => {
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

  const statusOptions = ['Open', 'Pending', 'Parking', 'Resolved'];
  const priorityOptions = ['High', 'Medium', 'Low'];

  // Welcome Page
  if (currentView === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-white opacity-10 rounded-full -top-48 -left-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-white opacity-10 rounded-full -bottom-48 -right-48 animate-pulse delay-1000"></div>
        </div>

        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => setCurrentView('login')}
            className="px-8 py-3 bg-white text-orange-600 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
          >
            Login
          </button>
        </div>

        <div className="relative z-10 text-center">
          <div className="mb-8 transform hover:scale-110 transition-transform duration-500">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-white opacity-20 blur-3xl rounded-full"></div>
              <div className="relative bg-white p-8 rounded-full shadow-2xl">
                <div className="text-orange-600 font-bold text-6xl" style={{
                  textShadow: '4px 4px 8px rgba(0,0,0,0.3)'
                }}>
                  J&J
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-white mb-4" style={{
            fontSize: 'clamp(2rem, 8vw, 5rem)',
            fontWeight: '900',
            textShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 40px rgba(255,255,255,0.3)',
            transform: 'perspective(500px) rotateX(5deg)',
            letterSpacing: '2px'
          }}>
            Welcome to
          </h1>

          <h2 className="text-white mb-3" style={{
            fontSize: 'clamp(2.5rem, 10vw, 6rem)',
            fontWeight: '900',
            background: 'linear-gradient(to bottom, #fff 0%, #fef3c7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 15px 35px rgba(0,0,0,0.6)',
            transform: 'perspective(800px) rotateX(10deg)',
            letterSpacing: '3px',
            lineHeight: '1.2'
          }}>
            Johnny & Jugnu
          </h2>

          <h3 className="text-white text-4xl md:text-6xl font-bold mb-8" style={{
            textShadow: '0 8px 25px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.2)',
            transform: 'perspective(600px) rotateX(8deg)',
            letterSpacing: '8px'
          }}>
            CIMS
          </h3>

          <p className="text-white text-xl md:text-2xl font-light mb-12" style={{
            textShadow: '0 4px 15px rgba(0,0,0,0.4)',
            letterSpacing: '2px'
          }}>
            Complaint & Inventory Management System
          </p>

          <button
            onClick={() => setCurrentView('login')}
            className="px-12 py-5 bg-white text-orange-600 rounded-full font-bold text-2xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 animate-bounce"
          >
            Get Started →
          </button>

          <div className="mt-16 flex flex-wrap justify-center gap-4">
            <div className="px-6 py-3 bg-white bg-opacity-20 backdrop-blur-md rounded-full text-white font-semibold">
              ⚡ Real-time Tracking
            </div>
            <div className="px-6 py-3 bg-white bg-opacity-20 backdrop-blur-md rounded-full text-white font-semibold">
              📊 Advanced Analytics
            </div>
            <div className="px-6 py-3 bg-white bg-opacity-20 backdrop-blur-md rounded-full text-white font-semibold">
              📦 Inventory Control
            </div>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-full mb-4">
                <div className="text-white font-bold text-3xl">J&J</div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Johnny and Jugnu</h1>
              <p className="text-gray-600 mt-2">Management System</p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder="Enter username"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder="Enter password"
                  disabled={loading}
                />
              </div>
              
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin w-5 h-5 mr-2" />
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </button>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <p className="font-semibold mb-1">Demo Credentials:</p>
                <p>Admin: admin / admin123</p>
                <p>User: user1 / user123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const analytics = getAnalyticsData();
  const inventoryAnalytics = getInventoryAnalytics();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-2 rounded-lg">
                <div className="text-orange-600 font-bold text-xl">J&J</div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Johnny and Jugnu</h1>
                <p className="text-sm text-orange-100">
                  Management System - {
                    currentUser?.role === 'admin' ? 'Admin' : 
                    currentUser?.role === 'support' ? 'Support' : 
                    'User'
                  } ({currentUser?.username})
                </p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-2">
              <button
                onClick={() => setCurrentView('analytics')}
                className={`px-4 py-2 rounded-lg transition ${currentView === 'analytics' ? 'bg-white text-orange-600' : 'hover:bg-orange-400'}`}
              >
                <BarChart3 className="inline-block w-4 h-4 mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg transition ${currentView === 'dashboard' ? 'bg-white text-orange-600' : 'hover:bg-orange-400'}`}
              >
                <FileText className="inline-block w-4 h-4 mr-2" />
                Complaints
              </button>
              {(currentUser?.role === 'admin' || currentUser?.role === 'support') && (
                <button
                  onClick={() => setCurrentView('inventory')}
                  className={`px-4 py-2 rounded-lg transition ${currentView === 'inventory' ? 'bg-white text-orange-600' : 'hover:bg-orange-400'}`}
                >
                  <Package className="inline-block w-4 h-4 mr-2" />
                  Inventory
                </button>
              )}
              <button
                onClick={() => setCurrentView('add')}
                className={`px-4 py-2 rounded-lg transition ${currentView === 'add' ? 'bg-white text-orange-600' : 'hover:bg-orange-400'}`}
              >
                <Plus className="inline-block w-4 h-4 mr-2" />
                Add New
              </button>
              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setCurrentView('users')}
                    className={`px-4 py-2 rounded-lg transition ${currentView === 'users' ? 'bg-white text-orange-600' : 'hover:bg-orange-400'}`}
                  >
                    <Users className="inline-block w-4 h-4 mr-2" />
                    Users
                  </button>
                  <button
                    onClick={() => setCurrentView('categories')}
                    className={`px-4 py-2 rounded-lg transition ${currentView === 'categories' ? 'bg-white text-orange-600' : 'hover:bg-orange-400'}`}
                  >
                    <Tag className="inline-block w-4 h-4 mr-2" />
                    Complaint Categories
                  </button>
                </>
              )}
            </nav>
            
            <div className="flex items-center gap-3">
              <button className="text-white hover:text-orange-200">
                <Bell className="w-6 h-6" />
              </button>
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setCurrentUser(null);
                  setCurrentView('login');
                  setLoginData({ username: '', password: '' });
                }}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition flex items-center gap-2"
              >
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative">
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError('')} className="absolute top-0 bottom-0 right-0 px-4">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-6">
        {/* INVENTORY VIEW */}
        {currentView === 'inventory' && (
          <div>
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
                            status: 'active'
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
                  onClick={() => setShowInventoryCategoryModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Asset Type
                </button>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => setShowSupplierModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Suppliers
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowStockMovementModal(true);
                    setNewStockMovement({
                      item_id: '',
                      movement_type: 'receipt',
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
                <button
                  onClick={() => {
                    setShowInventoryModal(true);
                    setEditingItem(null);
                    setNewInventoryItem({
                      name: '',
                      sku: '',
                      category: 'Raw Materials',
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
              </div>
            </div>

            {/* Inventory Overview Cards */}
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
                  ${inventoryAnalytics.totalValue.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Search and Filter */}
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

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <span className="font-semibold">{item.quantity}</span> {item.unit}
                              {item.quantity <= item.reorder_point && (
                                <div className="text-xs text-orange-600 mt-1">
                                  Reorder: {item.reorder_point} {item.unit}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">${item.unit_price}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                              ${(item.quantity * item.unit_price).toFixed(2)}
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
                            <td className="px-4 py-3 text-sm text-gray-700">{item.location}</td>
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

            {/* Recent Stock Movements */}
            <div className="mt-6 bg-white rounded-xl shadow-md p-6">
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
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            movement.movement_type === 'receipt' ? 'bg-green-100 text-green-700' :
                            movement.movement_type === 'usage' ? 'bg-blue-100 text-blue-700' :
                            movement.movement_type === 'wastage' ? 'bg-red-100 text-red-700' :
                            movement.movement_type === 'transfer' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {movement.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                          {movement.movement_type === 'receipt' || movement.movement_type === 'return' ? '+' : '-'}
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
          </div>
        )}

        {/* ANALYTICS VIEW */}
        {currentView === 'analytics' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {(currentUser?.role === 'admin' || currentUser?.role === 'support')
                    ? 'Analytics Dashboard - All Branches' 
                    : `Analytics Dashboard - ${currentUser?.branch}`
                  }
                </h2>
                {currentUser?.role !== 'admin' && currentUser?.role !== 'support' && (
                  <p className="text-sm text-gray-600 mt-1">Viewing analytics for your branch only</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Total</p>
                  <FileText className="w-8 h-8 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{analytics.total}</p>
                <div className="flex items-center text-sm">
                  {analytics.percentageChange >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  )}
                  <span className={analytics.percentageChange >= 0 ? 'text-red-500' : 'text-green-500'}>
                    {Math.abs(analytics.percentageChange)}%
                  </span>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Open</p>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{analytics.open}</p>
                <p className="text-sm text-gray-500">{((analytics.open / analytics.total) * 100).toFixed(1)}%</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">High Priority</p>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{analytics.high}</p>
                <p className="text-sm text-gray-500">{((analytics.high / analytics.total) * 100).toFixed(1)}%</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Pending</p>
                  <AlertCircle className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{analytics.pending}</p>
                <p className="text-sm text-gray-500">{((analytics.pending / analytics.total) * 100).toFixed(1)}%</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Resolved</p>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{analytics.resolved}</p>
                <p className="text-sm text-gray-500">{((analytics.resolved / analytics.total) * 100).toFixed(1)}%</p>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getStatusChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getStatusChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Priority Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getPriorityChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPriorityChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">7-Day Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={getWeeklyTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" style={{fontSize: '10px'}} />
                    <YAxis />
                    <Tooltip />
                    <Legend wrapperStyle={{fontSize: '11px'}} />
                    <Line type="monotone" dataKey="count" stroke="#EA580C" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="high" stroke="#EF4444" strokeWidth={2} name="High" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Categories</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getCategoryChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} style={{fontSize: '11px'}} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#EA580C" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {(currentUser?.role === 'admin' || currentUser?.role === 'support') 
                    ? 'Branch Performance' 
                    : 'My Branch Performance'
                  }
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {getBranchPerformance().map((branch, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{branch.branch}</span>
                        <span className="text-sm font-semibold text-orange-600">{branch.rate}%</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Total: {branch.total}</span>
                        <span>Resolved: {branch.resolved}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all" 
                          style={{width: `${branch.rate}%`}}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPLAINTS DASHBOARD */}
        {currentView === 'dashboard' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {(currentUser?.role === 'admin' || currentUser?.role === 'support')
                  ? 'Complaint Management - All Branches' 
                  : `Complaint Management - ${currentUser?.branch}`
                }
              </h2>
              {currentUser?.role !== 'admin' && currentUser?.role !== 'support' && (
                <p className="text-sm text-gray-600 mb-6">Viewing complaints for your branch only</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total</p>
                      <p className="text-3xl font-bold text-gray-800">{complaints.length}</p>
                    </div>
                    <FileText className="w-10 h-10 text-orange-500" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">High Priority</p>
                      <p className="text-3xl font-bold text-gray-800">
                        {complaints.filter(c => c.priority === 'High').length}
                      </p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Open</p>
                      <p className="text-3xl font-bold text-gray-800">
                        {complaints.filter(c => c.status === 'Open').length}
                      </p>
                    </div>
                    <Clock className="w-10 h-10 text-yellow-500" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Pending</p>
                      <p className="text-3xl font-bold text-gray-800">
                        {complaints.filter(c => c.status === 'Pending').length}
                      </p>
                    </div>
                    <AlertCircle className="w-10 h-10 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Resolved</p>
                      <p className="text-3xl font-bold text-gray-800">
                        {complaints.filter(c => c.status === 'Resolved').length}
                      </p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="mb-6 flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="inline w-4 h-4 mr-1" />
                    Search by Complaint Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchComplaintNumber}
                      onChange={(e) => setSearchComplaintNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchByComplaintNumber()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Enter complaint number (e.g., JJ-20251111-0001)"
                    />
                    <button
                      onClick={searchByComplaintNumber}
                      className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition shadow-md"
                    >
                      <Search className="inline-block w-4 h-4 mr-2" />
                      Search
                    </button>
                    {searchComplaintNumber && (
                      <button
                        onClick={() => {
                          setSearchComplaintNumber('');
                          loadComplaints();
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filterData.startDate}
                    onChange={(e) => setFilterData({...filterData, startDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filterData.endDate}
                    onChange={(e) => setFilterData({...filterData, endDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filterData.status}
                    onChange={(e) => setFilterData({...filterData, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="parking">Parking</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={filterData.priority}
                    onChange={(e) => setFilterData({...filterData, priority: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="all">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button 
                    onClick={loadComplaints}
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition shadow-md"
                  >
                    <Search className="inline-block w-4 h-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="animate-spin w-8 h-8 text-orange-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          <Hash className="inline w-4 h-4 mr-1" />
                          Complaint #
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Comments</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned To</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                        {currentUser?.role === 'admin' && (
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created By</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.map((complaint) => (
                        <tr key={complaint.id} className="border-b hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              {complaint.complaint_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{complaint.date}</td>
                          <td className="px-4 py-3">
                            {(currentUser?.role === 'admin' || currentUser?.role === 'support') ? (
                              <select
                                value={complaint.priority}
                                onChange={(e) => handlePriorityChange(complaint.id, e.target.value)}
                                className={`px-2 py-1 rounded-full text-xs font-semibold outline-none cursor-pointer border ${getPriorityBadge(complaint.priority)}`}
                              >
                                {priorityOptions.map(priority => (
                                  <option key={priority} value={priority}>{priority}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(complaint.priority)}`}>
                                {getPriorityIcon(complaint.priority)}
                                {complaint.priority}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{complaint.department}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{complaint.category}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{complaint.comments}</td>
                          <td className="px-4 py-3">
                            {(currentUser?.role === 'admin' || currentUser?.role === 'support') ? (
                              <select
                                value={complaint.status}
                                onChange={(e) => handleStatusChange(complaint.id, e.target.value)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold outline-none cursor-pointer ${
                                  complaint.status === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                                  complaint.status === 'Pending' ? 'bg-blue-100 text-blue-700' :
                                  complaint.status === 'Parking' ? 'bg-purple-100 text-purple-700' :
                                  'bg-green-100 text-green-700'
                                }`}
                              >
                                {statusOptions.map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                complaint.status === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                                complaint.status === 'Pending' ? 'bg-blue-100 text-blue-700' :
                                complaint.status === 'Parking' ? 'bg-purple-100 text-purple-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {complaint.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {(currentUser?.role === 'admin' || currentUser?.role === 'support') ? (
                              <select
                                value={complaint.assigned_to || ''}
                                onChange={(e) => handleAssignmentChange(complaint.id, e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                              >
                                <option value="">Unassigned</option>
                                {users.filter(u => u.role === 'support' || u.role === 'admin').map((user) => (
                                  <option key={user.id} value={user.username}>
                                    {user.username}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-sm text-gray-700">
                                {complaint.assigned_to ? (
                                  <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold">
                                    👤 {complaint.assigned_to}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">Unassigned</span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{complaint.branch}</td>
                          {currentUser?.role === 'admin' && (
                            <td className="px-4 py-3 text-sm text-gray-700">{complaint.created_by}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADD NEW COMPLAINT */}
        {currentView === 'add' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Maintenance Complaint</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Complaint Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                    <select
                      value={newComplaint.department}
                      onChange={(e) => {
                        setNewComplaint({...newComplaint, department: e.target.value, category: ''});
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="IT">IT</option>
                      <option value="Operations">Operations</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      value={newComplaint.category}
                      onChange={(e) => setNewComplaint({...newComplaint, category: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="">Select Category</option>
                      {getCategoriesByDepartment(newComplaint.department).map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    {getCategoriesByDepartment(newComplaint.department).length === 0 && (
                      <p className="text-sm text-orange-600 mt-1">No categories available for this department</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                    <select
                      value={newComplaint.priority}
                      onChange={(e) => setNewComplaint({...newComplaint, priority: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="Low">🟢 Low - Can wait</option>
                      <option value="Medium">🟡 Medium - Normal issue</option>
                      <option value="High">🔴 High - Urgent!</option>
                    </select>
                  </div>

                  {(currentUser?.role === 'admin' || currentUser?.role === 'support') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign To (Optional)
                      </label>
                      <select
                        value={newComplaint.assigned_to}
                        onChange={(e) => setNewComplaint({...newComplaint, assigned_to: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                      >
                        <option value="">Unassigned</option>
                        {users.filter(u => u.role === 'support' || u.role === 'admin').map((user) => (
                          <option key={user.id} value={user.username}>
                            {user.username} - {user.role.charAt(0).toUpperCase() + user.role.slice(1)} ({user.branch})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Assign this complaint to a support or admin user
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comments *</label>
                    <textarea
                      value={newComplaint.comments}
                      onChange={(e) => setNewComplaint({...newComplaint, comments: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-32 resize-none"
                      placeholder="Describe the issue in detail..."
                    />
                  </div>
                  
                  <button
                    onClick={handleAddComplaint}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin w-5 h-5 mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Complaint'
                    )}
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Complaints</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {complaints.slice(0, 5).map((c) => (
                    <div key={c.id} className="p-3 border border-gray-200 rounded-lg hover:border-orange-300 transition">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          {c.complaint_number}
                        </span>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityBadge(c.priority)}`}>
                            {c.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            c.status === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                            c.status === 'Pending' ? 'bg-blue-100 text-blue-700' :
                            c.status === 'Parking' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-orange-600">{c.category}</span>
                      <p className="text-sm text-gray-700 line-clamp-2 mt-1">{c.comments}</p>
                      <p className="text-xs text-gray-500 mt-2">{c.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT */}
        {currentView === 'users' && currentUser?.role === 'admin' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setNewUser({ username: '', password: '', email: '', role: 'user', branch: '' });
                  setShowUserModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition shadow-md"
              >
                <Plus className="inline-block w-4 h-4 mr-2" />
                Add User
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="animate-spin w-8 h-8 text-orange-500" />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-700">{user.username}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin' ? 'bg-red-100 text-red-700' : 
                            user.role === 'support' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{user.branch}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setNewUser(user);
                              setShowUserModal(true);
                            }}
                            className="text-orange-600 hover:text-orange-800 mr-3"
                          >
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* CATEGORIES MANAGEMENT */}
        {currentView === 'categories' && currentUser?.role === 'admin' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Category Management</h2>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition shadow-md"
              >
                <Plus className="inline-block w-4 h-4 mr-2" />
                Add Category
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="animate-spin w-8 h-8 text-orange-500" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full mr-3">IT</span>
                    {allCategories.filter(c => c.department === 'IT').length} Categories
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allCategories.filter(c => c.department === 'IT').map((category) => (
                      <div key={category.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center hover:border-orange-300 transition">
                        <div className="flex items-center">
                          <Tag className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-gray-800">{category.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {allCategories.filter(c => c.department === 'IT').length === 0 && (
                    <p className="text-gray-500 text-center py-4">No categories in IT department</p>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full mr-3">Operations</span>
                    {allCategories.filter(c => c.department === 'Operations').length} Categories
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allCategories.filter(c => c.department === 'Operations').map((category) => (
                      <div key={category.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center hover:border-orange-300 transition">
                        <div className="flex items-center">
                          <Tag className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-gray-800">{category.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {allCategories.filter(c => c.department === 'Operations').length === 0 && (
                    <p className="text-gray-500 text-center py-4">No categories in Operations department</p>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="bg-purple-500 text-white px-3 py-1 rounded-full mr-3">Maintenance</span>
                    {allCategories.filter(c => c.department === 'Maintenance').length} Categories
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allCategories.filter(c => c.department === 'Maintenance').map((category) => (
                      <div key={category.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center hover:border-orange-300 transition">
                        <div className="flex items-center">
                          <Tag className="w-4 h-4 text-purple-500 mr-2" />
                          <span className="text-gray-800">{category.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {allCategories.filter(c => c.department === 'Maintenance').length === 0 && (
                    <p className="text-gray-500 text-center py-4">No categories in Maintenance department</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Inventory Item Modal */}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price ($) *</label>
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

      {/* Supplier Modal */}
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

      {/* Stock Movement Modal */}
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
                  <option value="receipt">Receipt (Add Stock)</option>
                  <option value="usage">Usage (Remove Stock)</option>
                  <option value="wastage">Wastage (Remove Stock)</option>
                  <option value="transfer">Transfer</option>
                  <option value="return">Return (Add Stock)</option>
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
                      status: 'active'
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

      {/* USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter username"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter email"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter password"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  disabled={loading}
                >
                  <option value="user">User</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  User: View only • Support: View + Update • Admin: Full access
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                <input
                  type="text"
                  value={newUser.branch}
                  onChange={(e) => setNewUser({...newUser, branch: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter branch name"
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <Loader className="animate-spin w-5 h-5" />
                  ) : (
                    `${editingUser ? 'Update' : 'Add'} User`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Add New Category</h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                <select
                  value={newCategory.department}
                  onChange={(e) => setNewCategory({...newCategory, department: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  disabled={loading}
                >
                  <option value="IT">IT</option>
                  <option value="Operations">Operations</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Enter category name"
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <Loader className="animate-spin w-5 h-5" />
                  ) : (
                    'Add Category'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JohnnyCMS;
