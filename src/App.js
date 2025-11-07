import React, { useState } from 'react';
 import { AlertCircle, CheckCircle, Clock, Search, Plus, Bell, FileText, BarChart3, Users, Tag, Edit, Trash2 } from 'lucide-react';
const JohnnyCMS = () => {
  const [currentView, setCurrentView] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [complaints, setComplaints] = useState([
    {
      id: 1,
      date: 'Nov 5 2025 4:07PM',
      department: 'IT',
      category: 'Connectivity',
      item: 'Network Issues',
      comments: 'Systems are too slow POS 1343 1344 1345 and booth the KIOSKS are taking too long to punch order and printing customer slips please resolve it asap',
      status: 'Open',
      branch: 'Johar Town(Johar Town)'
    },
    {
      id: 2,
      date: 'Nov 5 2025 1:27AM',
      department: 'IT',
      category: 'POS System',
      item: 'System Crash',
      comments: 'POS and ledge that our delivery POS not getting started. POS not getting started as well. Plz do the needful for smooth operations',
      status: 'Open',
      branch: 'Bahria Boulevard Lahore(Bahria Boulevard Lahore)'
    },
    {
      id: 3,
      date: 'Nov 4 2025 8:22PM',
      department: 'IT',
      category: 'Printer',
      item: 'Printer Error',
      comments: 'Delivery POS Printer not working',
      status: 'Open',
      branch: 'Bahria Boulevard Lahore(Bahria Boulevard Lahore)'
    }
  ]);

  const [newComplaint, setNewComplaint] = useState({
    department: 'IT',
    category: '',
    comments: ''
  });

  const [filterData, setFilterData] = useState({
    startDate: '11/01/2025',
    endDate: '11/05/2025',
    status: 'all'
  });

  const categories = [
    'Select Category',
    'Khadim',
    'Installation',
    'Computer Accessories',
    'Cash Taker',
    'Hardware',
    'Connectivity',
    'CCTV',
    'Computer Accessories',
    'POS Machine',
    'Fuel Freezer',
    'RGIS (Hangin Line)',
    'Extra Hand Print (1x20)',
    'HVAC',
    'HRF connectivity',
    'Firewater Lift',
    'Generator',
    'Time line Machine',
    'Bond Bill',
    'KIOSK',
    'KDS',
    'Printer',
    'IT Equipment'
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.username && loginData.password) {
      setIsLoggedIn(true);
      setCurrentView('dashboard');
    }
  };

  const handleAddComplaint = (e) => {
    e.preventDefault();
    if (newComplaint.category && newComplaint.comments) {
      const complaint = {
        id: complaints.length + 1,
        date: new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true 
        }),
        department: newComplaint.department,
        category: newComplaint.category,
        item: newComplaint.category,
        comments: newComplaint.comments,
        status: 'Open',
        branch: 'New Branch'
      };
      setComplaints([complaint, ...complaints]);
      setNewComplaint({ department: 'IT', category: '', comments: '' });
      setCurrentView('dashboard');
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterData.status === 'all') return true;
    return c.status.toLowerCase() === filterData.status;
  });

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
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username or Email</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder="Enter username or email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder="Enter password"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition shadow-lg"
              >
                Log In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-2 rounded-lg">
                <div className="text-orange-600 font-bold text-xl">J&J</div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Johnny and Jugnu</h1>
                <p className="text-sm text-orange-100">IT Support Central</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg transition ${currentView === 'dashboard' ? 'bg-white text-orange-600' : 'hover:bg-orange-400'}`}
              >
                <BarChart3 className="inline-block w-4 h-4 mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('complaints')}
                className={`px-4 py-2 rounded-lg transition ${currentView === 'complaints' ? 'bg-white text-orange-600' : 'hover:bg-orange-400'}`}
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
            </nav>
            
            <button className="text-white hover:text-orange-200">
              <Bell className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {currentView === 'dashboard' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Complaint Overview</h2>
              
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
                
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Critical</p>
                      <p className="text-3xl font-bold text-gray-800">2</p>
                    </div>
                    <AlertCircle className="w-10 h-10 text-red-500" />
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
                    value={filterData.startDate.split('/').reverse().join('-')}
                    onChange={(e) => setFilterData({...filterData, startDate: e.target.value.split('-').reverse().join('/')})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filterData.endDate.split('/').reverse().join('-')}
                    onChange={(e) => setFilterData({...filterData, endDate: e.target.value.split('-').reverse().join('/')})}
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
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition shadow-md">
                    <Search className="inline-block w-4 h-4 mr-2" />
                    Search
                  </button>
                </div>
              </div>

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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
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
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            complaint.status === 'Open' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {complaint.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{complaint.branch}</td>
                        <td className="px-4 py-3">
                          <button className="text-orange-600 hover:text-orange-800 font-semibold text-sm">
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentView === 'add' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Maintenance Complaint</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Complaint Details</h3>
                
                <form onSubmit={handleAddComplaint} className="space-y-4">
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
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                    <textarea
                      value={newComplaint.comments}
                      onChange={(e) => setNewComplaint({...newComplaint, comments: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-32 resize-none"
                      placeholder="Describe the issue in detail..."
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition shadow-md"
                  >
                    Save Complaint
                  </button>
                </form>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Complaints</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {complaints.slice(0, 5).map((c) => (
                    <div key={c.id} className="p-3 border border-gray-200 rounded-lg hover:border-orange-300 transition">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-orange-600">{c.category}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          c.status === 'Open' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-green-100 text-green-700'
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
      </main>
    </div>
  );
};

export default JohnnyCMS;
