import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Search, Plus, Bell, FileText, BarChart3, Users, Tag, Edit, Trash2, X, Loader, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from './supabaseClient';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const JohnnyCMS = () => {
  const [currentView, setCurrentView] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const [newComplaint, setNewComplaint] = useState({
    department: 'IT',
    category: '',
    comments: ''
  });

  const [filterData, setFilterData] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: 'all'
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', role: 'user', branch: '' });
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      loadComplaints();
      loadCategories();
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
        .order('name', { ascending: true });
      
      if (error) throw error;
      setCategories(data?.map(cat => cat.name) || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedComplaints = data?.map(c => ({
        ...c,
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
      
      const { error } = await supabase
        .from('complaints')
        .insert([{
          department: newComplaint.department,
          category: newComplaint.category,
          comments: newComplaint.comments,
          status: 'Open',
          branch: currentUser?.branch || 'Unknown',
          created_by: currentUser?.username || 'unknown'
        }])
        .select();
      
      if (error) throw error;
      
      await loadComplaints();
      setNewComplaint({ department: 'IT', category: '', comments: '' });
      setCurrentView('dashboard');
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
    if (!newCategory || categories.includes(newCategory)) {
      setError('Category already exists or is empty');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategory }]);
      
      if (error) throw error;
      await loadCategories();
      setNewCategory('');
      setShowCategoryModal(false);
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('name', categoryName);
      
      if (error) throw error;
      await loadCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // Analytics Functions
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
        resolved: dayComplaints.filter(c => c.status === 'Resolved').length
      });
    }
    
    return data;
  };

  const getBranchPerformance = () => {
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
      Date: c.date,
      Department: c.department,
      Category: c.category,
      Comments: c.comments,
      Status: c.status,
      Branch: c.branch,
      'Created By': c.created_by
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
    XLSX.writeFile(wb, `JJ_Complaints_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Johnny & Jugnu - Complaints Report', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    const tableData = complaints.map(c => [
      c.date,
      c.department,
      c.category,
      c.status,
      c.branch
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [['Date', 'Department', 'Category', 'Status', 'Branch']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234, 88, 12] }
    });
    
    doc.save(`JJ_Complaints_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterData.status === 'all') return true;
    return c.status.toLowerCase() === filterData.status;
  });

  const statusOptions = ['Open', 'Pending', 'Parking', 'Resolved'];
  const COLORS = ['#EAB308', '#3B82F6', '#A855F7', '#10B981'];

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
              <p className="text-gray-600 mt-2">IT Support Central</p>
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
                <p className="text-sm text-orange-100">IT Support Central - {currentUser?.role === 'admin' ? 'Admin' : 'User'} ({currentUser?.username})</p>
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
                    Categories
                  </button>
                </>
              )}
            </nav>
            
            <button className="text-white hover:text-orange-200">
              <Bell className="w-6 h-6" />
            </button>
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
        {currentView === 'analytics' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Total Complaints</p>
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
                  <span className="text-gray-500 ml-1">vs last week</span>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Open</p>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{analytics.open}</p>
                <p className="text-sm text-gray-500">{((analytics.open / analytics.total) * 100).toFixed(1)}% of total</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Pending</p>
                  <AlertCircle className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{analytics.pending}</p>
                <p className="text-sm text-gray-500">{((analytics.pending / analytics.total) * 100).toFixed(1)}% of total</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Resolved</p>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{analytics.resolved}</p>
                <p className="text-sm text-gray-500">{((analytics.resolved / analytics.total) * 100).toFixed(1)}% resolution rate</p>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Status Distribution Pie Chart */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Complaints by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
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

              {/* Weekly Trend Line Chart */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">7-Day Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getWeeklyTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" style={{fontSize: '12px'}} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#EA580C" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Category Breakdown Bar Chart */}
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

              {/* Branch Performance */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Branch Performance</h3>
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

        {currentView === 'dashboard' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Complaint Management</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Complaints</p>
                      <p className="text-3xl font-bold text-gray-800">{complaints.length}</p>
                    </div>
                    <FileText className="w-10 h-10 text-orange-500" />
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Comments</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                        {currentUser?.role === 'admin' && (
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created By</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.map((complaint) => (
                        <tr key={complaint.id} className="border-b hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm text-gray-700">{complaint.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{complaint.department}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{complaint.category}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{complaint.comments}</td>
                          <td className="px-4 py-3">
                            {currentUser?.role === 'admin' ? (
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
                      onChange={(e) => setNewComplaint({...newComplaint, department: e.target.value})}
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
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
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
                        <span className="text-xs font-semibold text-orange-600">{c.category}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          c.status === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                          c.status === 'Pending' ? 'bg-blue-100 text-blue-700' :
                          c.status === 'Parking' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{c.comments}</p>
                      <p className="text-xs text-gray-500 mt-2">{c.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
                            user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div key={category} className="bg-white rounded-xl shadow-md p-4 flex justify-between items-center hover:shadow-lg transition">
                    <div className="flex items-center">
                      <Tag className="w-5 h-5 text-orange-500 mr-3" />
                      <span className="text-gray-800 font-medium">{category}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

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
                  <option value="admin">Admin</option>
                </select>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
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