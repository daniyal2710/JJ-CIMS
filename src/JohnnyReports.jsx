import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, FileText, Package, DollarSign, AlertCircle, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const JohnnyReports = ({ complaints, pettyCashEntries, currentUser }) => {
  const [selectedReport, setSelectedReport] = useState('complaint-branch');
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // Additional filters for each report type
  const [branchFilter, setBranchFilter] = useState('all');
  const [rcaFilter, setRcaFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');

  // REPORT 1: COMPLAINT REPORT - BRANCH WISE
  const getComplaintsByBranch = () => {
    const filtered = complaints.filter(c => {
      const complaintDate = new Date(c.created_at);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      const dateMatch = complaintDate >= startDate && complaintDate <= endDate;
      const branchMatch = branchFilter === 'all' || c.branch === branchFilter;
      return dateMatch && branchMatch;
    });

    const branchStats = {};
    
    filtered.forEach(complaint => {
      const branch = complaint.branch || 'Unknown';
      
      if (!branchStats[branch]) {
        branchStats[branch] = {
          branch,
          total: 0,
          open: 0,
          pending: 0,
          parking: 0,
          resolved: 0,
          high: 0,
          medium: 0,
          low: 0,
          avgResolutionTime: 0,
          resolvedComplaints: []
        };
      }
      
      branchStats[branch].total++;
      
      // Status counts
      if (complaint.status === 'Open') branchStats[branch].open++;
      if (complaint.status === 'Pending') branchStats[branch].pending++;
      if (complaint.status === 'Parking') branchStats[branch].parking++;
      if (complaint.status === 'Resolved') {
        branchStats[branch].resolved++;
        branchStats[branch].resolvedComplaints.push(complaint);
      }
      
      // Priority counts
      if (complaint.priority === 'High') branchStats[branch].high++;
      if (complaint.priority === 'Medium') branchStats[branch].medium++;
      if (complaint.priority === 'Low') branchStats[branch].low++;
    });

    // Calculate resolution rate and avg resolution time
    Object.keys(branchStats).forEach(branch => {
      const stats = branchStats[branch];
      stats.resolutionRate = stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : '0';
      
      // Calculate average resolution time
      if (stats.resolvedComplaints.length > 0) {
        const totalTime = stats.resolvedComplaints.reduce((sum, complaint) => {
          if (complaint.resolved_at && complaint.created_at) {
            const created = new Date(complaint.created_at);
            const resolved = new Date(complaint.resolved_at);
            const hours = (resolved - created) / (1000 * 60 * 60);
            return sum + hours;
          }
          return sum;
        }, 0);
        
        stats.avgResolutionTime = (totalTime / stats.resolvedComplaints.length).toFixed(1);
      }
    });

    return Object.values(branchStats).sort((a, b) => b.total - a.total);
  };

  // REPORT 2: EXPENSE REPORT - BRANCH WISE
  const getExpensesByBranch = () => {
    const filtered = pettyCashEntries.filter(entry => {
      const entryDate = new Date(entry.dated);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      const dateMatch = entryDate >= startDate && entryDate <= endDate;
      const branchMatch = branchFilter === 'all' || entry.branch === branchFilter;
      return dateMatch && branchMatch;
    });

    const branchExpenses = {};
    
    filtered.forEach(entry => {
      const branch = entry.branch || 'Unknown';
      
      if (!branchExpenses[branch]) {
        branchExpenses[branch] = {
          branch,
          totalExpense: 0,
          totalEntries: 0,
          paid: 0,
          pending: 0,
          partiallyPaid: 0,
          byVendor: {},
          byComment: {},
          entries: []
        };
      }
      
      const amount = parseFloat(entry.amount || 0);
      branchExpenses[branch].totalExpense += amount;
      branchExpenses[branch].totalEntries++;
      branchExpenses[branch].entries.push(entry);
      
      // Payment status
      if (entry.payment_status === 'Paid') {
        branchExpenses[branch].paid += amount;
      } else if (entry.payment_status === 'Partially Paid') {
        branchExpenses[branch].partiallyPaid += amount;
      } else {
        branchExpenses[branch].pending += amount;
      }
      
      // By vendor
      const vendor = entry.vendor || 'No Vendor';
      if (!branchExpenses[branch].byVendor[vendor]) {
        branchExpenses[branch].byVendor[vendor] = 0;
      }
      branchExpenses[branch].byVendor[vendor] += amount;
      
      // By comment type
      const comment = entry.comments || 'Other';
      if (!branchExpenses[branch].byComment[comment]) {
        branchExpenses[branch].byComment[comment] = 0;
      }
      branchExpenses[branch].byComment[comment] += amount;
    });

    return Object.values(branchExpenses).sort((a, b) => b.totalExpense - a.totalExpense);
  };

  // REPORT 3: COMPLAINT REPORT - RCA WISE
  const getComplaintsByRCA = () => {
    const filtered = complaints.filter(c => {
      const complaintDate = new Date(c.created_at);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      const dateMatch = complaintDate >= startDate && complaintDate <= endDate;
      const rcaMatch = rcaFilter === 'all' || c.rca === rcaFilter;
      return dateMatch && c.status === 'Resolved' && c.rca && rcaMatch;
    });

    const rcaStats = {};
    
    filtered.forEach(complaint => {
      const rca = complaint.rca || 'No RCA';
      
      if (!rcaStats[rca]) {
        rcaStats[rca] = {
          rca,
          count: 0,
          byBranch: {},
          byDepartment: {},
          byPriority: { High: 0, Medium: 0, Low: 0 },
          avgResolutionTime: 0,
          complaints: []
        };
      }
      
      rcaStats[rca].count++;
      rcaStats[rca].complaints.push(complaint);
      
      // By branch
      const branch = complaint.branch || 'Unknown';
      rcaStats[rca].byBranch[branch] = (rcaStats[rca].byBranch[branch] || 0) + 1;
      
      // By department
      const dept = complaint.department || 'Unknown';
      rcaStats[rca].byDepartment[dept] = (rcaStats[rca].byDepartment[dept] || 0) + 1;
      
      // By priority
      if (complaint.priority) {
        rcaStats[rca].byPriority[complaint.priority]++;
      }
    });

    // Calculate average resolution time for each RCA
    Object.keys(rcaStats).forEach(rca => {
      const stats = rcaStats[rca];
      const totalTime = stats.complaints.reduce((sum, complaint) => {
        if (complaint.resolved_at && complaint.created_at) {
          const created = new Date(complaint.created_at);
          const resolved = new Date(complaint.resolved_at);
          const hours = (resolved - created) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);
      
      stats.avgResolutionTime = stats.complaints.length > 0 
        ? (totalTime / stats.complaints.length).toFixed(1) 
        : '0';
    });

    return Object.values(rcaStats).sort((a, b) => b.count - a.count);
  };

  // REPORT 4: EXPENSE REPORT - EQUIPMENT WISE
  const getExpensesByEquipment = () => {
    const filtered = pettyCashEntries.filter(entry => {
      const entryDate = new Date(entry.dated);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      return entryDate >= startDate && entryDate <= endDate;
    });

    // Extract equipment/item from description
    const equipmentExpenses = {};
    
    filtered.forEach(entry => {
      // Try to identify equipment from description
      const description = (entry.description || '').toLowerCase();
      let equipment = 'General/Other';
      
      // Common equipment keywords
      const equipmentKeywords = {
        'Camera': ['camera', 'cctv', 'surveillance'],
        'Printer': ['printer', 'printing', 'cartridge'],
        'Computer': ['computer', 'cpu', 'pc', 'laptop'],
        'Network': ['router', 'switch', 'network', 'wifi', 'internet'],
        'POS': ['pos', 'cash drawer', 'receipt'],
        'LCD/Monitor': ['lcd', 'monitor', 'screen', 'display'],
        'Keyboard/Mouse': ['keyboard', 'mouse', 'numpad'],
        'Access Control': ['access control', 'attendance', 'biometric'],
        'Cable/Wiring': ['cable', 'wire', 'wiring', 'patch'],
        'UPS/Power': ['ups', 'power', 'battery', 'pdu'],
        'Server/NVR': ['server', 'nvr', 'dvr'],
        'Other Hardware': ['adapter', 'vga', 'hdmi', 'usb']
      };
      
      // Check description for equipment keywords
      for (const [equipType, keywords] of Object.entries(equipmentKeywords)) {
        if (keywords.some(keyword => description.includes(keyword))) {
          equipment = equipType;
          break;
        }
      }
      
      // Apply equipment filter
      if (equipmentFilter !== 'all') {
        // Extract base equipment type (remove suffix like "(Repair)")
        const baseEquipment = equipment.split(' (')[0];
        if (baseEquipment !== equipmentFilter) {
          return; // Skip this entry if it doesn't match the filter
        }
      }
      
      // Also check comments field
      const comments = (entry.comments || '').toLowerCase();
      if (comments.includes('repairing')) equipment += ' (Repair)';
      if (comments.includes('new installation')) equipment += ' (New)';
      if (comments.includes('maintenance')) equipment += ' (Maintenance)';
      
      if (!equipmentExpenses[equipment]) {
        equipmentExpenses[equipment] = {
          equipment,
          totalExpense: 0,
          count: 0,
          byBranch: {},
          byVendor: {},
          entries: []
        };
      }
      
      const amount = parseFloat(entry.amount || 0);
      equipmentExpenses[equipment].totalExpense += amount;
      equipmentExpenses[equipment].count++;
      equipmentExpenses[equipment].entries.push(entry);
      
      // By branch
      const branch = entry.branch || 'Unknown';
      equipmentExpenses[equipment].byBranch[branch] = 
        (equipmentExpenses[equipment].byBranch[branch] || 0) + amount;
      
      // By vendor
      const vendor = entry.vendor || 'No Vendor';
      equipmentExpenses[equipment].byVendor[vendor] = 
        (equipmentExpenses[equipment].byVendor[vendor] || 0) + amount;
    });

    return Object.values(equipmentExpenses).sort((a, b) => b.totalExpense - a.totalExpense);
  };

  // Export Functions
  const exportComplaintBranchReport = () => {
    const data = getComplaintsByBranch();
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Complaint Report - Branch Wise', 14, 20);
    doc.setFontSize(11);
    doc.text(`Period: ${dateFilter.startDate} to ${dateFilter.endDate}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    
    // Summary
    const totalComplaints = data.reduce((sum, b) => sum + b.total, 0);
    const totalResolved = data.reduce((sum, b) => sum + b.resolved, 0);
    const overallResolutionRate = totalComplaints > 0 
      ? ((totalResolved / totalComplaints) * 100).toFixed(1) 
      : '0';
    
    doc.text(`Total Branches: ${data.length}`, 14, 42);
    doc.text(`Total Complaints: ${totalComplaints}`, 14, 49);
    doc.text(`Overall Resolution Rate: ${overallResolutionRate}%`, 14, 56);
    
    // Table
    const tableData = data.map(branch => [
      branch.branch,
      branch.total,
      branch.open,
      branch.pending,
      branch.resolved,
      `${branch.resolutionRate}%`,
      branch.high,
      branch.medium,
      branch.low,
      `${branch.avgResolutionTime}h`
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [['Branch', 'Total', 'Open', 'Pending', 'Resolved', 'Res. Rate', 'High', 'Med', 'Low', 'Avg Time']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234, 88, 12] }
    });
    
    doc.save(`Complaint_Branch_Report_${dateFilter.startDate}_to_${dateFilter.endDate}.pdf`);
  };

  const exportExpenseBranchReport = () => {
    const data = getExpensesByBranch();
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Expense Report - Branch Wise', 14, 20);
    doc.setFontSize(11);
    doc.text(`Period: ${dateFilter.startDate} to ${dateFilter.endDate}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    
    const totalExpense = data.reduce((sum, b) => sum + b.totalExpense, 0);
    const totalEntries = data.reduce((sum, b) => sum + b.totalEntries, 0);
    
    doc.text(`Total Branches: ${data.length}`, 14, 42);
    doc.text(`Total Expense: Rs ${totalExpense.toLocaleString()}`, 14, 49);
    doc.text(`Total Entries: ${totalEntries}`, 14, 56);
    
    const tableData = data.map(branch => [
      branch.branch,
      branch.totalEntries,
      `Rs ${branch.totalExpense.toLocaleString()}`,
      `Rs ${branch.paid.toLocaleString()}`,
      `Rs ${branch.pending.toLocaleString()}`,
      `Rs ${(branch.totalExpense / branch.totalEntries).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [['Branch', 'Entries', 'Total', 'Paid', 'Pending', 'Avg/Entry']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    // Add page 2 with vendor breakdown
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Vendor Breakdown by Branch', 14, 20);
    
    let currentY = 30;
    data.forEach(branch => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.text(branch.branch, 14, currentY);
      currentY += 7;
      
      const vendorData = Object.entries(branch.byVendor).map(([vendor, amount]) => [
        vendor,
        `Rs ${amount.toLocaleString()}`
      ]);
      
      autoTable(doc, {
        startY: currentY,
        head: [['Vendor', 'Amount']],
        body: vendorData,
        styles: { fontSize: 8 },
        margin: { left: 20 }
      });
      
      currentY = doc.lastAutoTable.finalY + 10;
    });
    
    doc.save(`Expense_Branch_Report_${dateFilter.startDate}_to_${dateFilter.endDate}.pdf`);
  };

  const exportComplaintRCAReport = () => {
    const data = getComplaintsByRCA();
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Complaint Report - RCA Analysis', 14, 20);
    doc.setFontSize(11);
    doc.text(`Period: ${dateFilter.startDate} to ${dateFilter.endDate}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    doc.text(`Resolved Complaints Only`, 14, 42);
    
    const totalResolved = data.reduce((sum, r) => sum + r.count, 0);
    doc.text(`Total Resolved: ${totalResolved}`, 14, 49);
    doc.text(`RCA Categories: ${data.length}`, 14, 56);
    
    const tableData = data.map(rca => [
      rca.rca,
      rca.count,
      `${((rca.count / totalResolved) * 100).toFixed(1)}%`,
      rca.byPriority.High,
      rca.byPriority.Medium,
      rca.byPriority.Low,
      `${rca.avgResolutionTime}h`
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [['Root Cause', 'Count', '% of Total', 'High', 'Med', 'Low', 'Avg Time']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Add page 2 with branch breakdown per RCA
    doc.addPage();
    doc.setFontSize(16);
    doc.text('RCA Distribution by Branch', 14, 20);
    
    let currentY = 30;
    data.slice(0, 10).forEach(rca => { // Top 10 RCAs
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.text(`${rca.rca} (${rca.count} cases)`, 14, currentY);
      currentY += 7;
      
      const branchData = Object.entries(rca.byBranch)
        .sort((a, b) => b[1] - a[1])
        .map(([branch, count]) => [
          branch,
          count,
          `${((count / rca.count) * 100).toFixed(1)}%`
        ]);
      
      autoTable(doc, {
        startY: currentY,
        head: [['Branch', 'Count', '% of RCA']],
        body: branchData,
        styles: { fontSize: 8 },
        margin: { left: 20 }
      });
      
      currentY = doc.lastAutoTable.finalY + 10;
    });
    
    doc.save(`Complaint_RCA_Report_${dateFilter.startDate}_to_${dateFilter.endDate}.pdf`);
  };

  const exportExpenseEquipmentReport = () => {
    const data = getExpensesByEquipment();
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Expense Report - Equipment Wise', 14, 20);
    doc.setFontSize(11);
    doc.text(`Period: ${dateFilter.startDate} to ${dateFilter.endDate}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    
    const totalExpense = data.reduce((sum, e) => sum + e.totalExpense, 0);
    const totalEntries = data.reduce((sum, e) => sum + e.count, 0);
    
    doc.text(`Total Equipment Categories: ${data.length}`, 14, 42);
    doc.text(`Total Expense: Rs ${totalExpense.toLocaleString()}`, 14, 49);
    doc.text(`Total Entries: ${totalEntries}`, 14, 56);
    
    const tableData = data.map(equip => [
      equip.equipment,
      equip.count,
      `Rs ${equip.totalExpense.toLocaleString()}`,
      `${((equip.totalExpense / totalExpense) * 100).toFixed(1)}%`,
      `Rs ${(equip.totalExpense / equip.count).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [['Equipment/Category', 'Entries', 'Total Expense', '% of Total', 'Avg/Entry']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] },
      columnStyles: {
        0: { cellWidth: 60 }
      }
    });
    
    // Add page 2 with branch breakdown per equipment
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Equipment Expense by Branch', 14, 20);
    
    let currentY = 30;
    data.slice(0, 10).forEach(equip => { // Top 10 equipment
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.text(`${equip.equipment} (Rs ${equip.totalExpense.toLocaleString()})`, 14, currentY);
      currentY += 7;
      
      const branchData = Object.entries(equip.byBranch)
        .sort((a, b) => b[1] - a[1])
        .map(([branch, amount]) => [
          branch,
          `Rs ${amount.toLocaleString()}`,
          `${((amount / equip.totalExpense) * 100).toFixed(1)}%`
        ]);
      
      autoTable(doc, {
        startY: currentY,
        head: [['Branch', 'Amount', '% of Equipment']],
        body: branchData,
        styles: { fontSize: 8 },
        margin: { left: 20 }
      });
      
      currentY = doc.lastAutoTable.finalY + 10;
    });
    
    doc.save(`Expense_Equipment_Report_${dateFilter.startDate}_to_${dateFilter.endDate}.pdf`);
  };

  // Excel exports
  const exportToExcel = (reportType) => {
    let data, sheetName, fileName;
    
    switch(reportType) {
      case 'complaint-branch':
        data = getComplaintsByBranch();
        sheetName = 'Complaints by Branch';
        fileName = `Complaint_Branch_Report_${dateFilter.startDate}_to_${dateFilter.endDate}.xlsx`;
        break;
      case 'expense-branch':
        data = getExpensesByBranch();
        sheetName = 'Expenses by Branch';
        fileName = `Expense_Branch_Report_${dateFilter.startDate}_to_${dateFilter.endDate}.xlsx`;
        break;
      case 'complaint-rca':
        data = getComplaintsByRCA();
        sheetName = 'Complaints by RCA';
        fileName = `Complaint_RCA_Report_${dateFilter.startDate}_to_${dateFilter.endDate}.xlsx`;
        break;
      case 'expense-equipment':
        data = getExpensesByEquipment();
        sheetName = 'Expenses by Equipment';
        fileName = `Expense_Equipment_Report_${dateFilter.startDate}_to_${dateFilter.endDate}.xlsx`;
        break;
    }
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };

  // Render report based on selection
  const renderReport = () => {
    switch(selectedReport) {
      case 'complaint-branch':
        return <ComplaintBranchReport data={getComplaintsByBranch()} />;
      case 'expense-branch':
        return <ExpenseBranchReport data={getExpensesByBranch()} />;
      case 'complaint-rca':
        return <ComplaintRCAReport data={getComplaintsByRCA()} />;
      case 'expense-equipment':
        return <ExpenseEquipmentReport data={getExpensesByEquipment()} />;
      default:
        return null;
    }
  };

  // Report Components
  const ComplaintBranchReport = ({ data }) => {
    const chartData = data.slice(0, 10).map(b => ({
      name: b.branch,
      Total: b.total,
      Resolved: b.resolved,
      Open: b.open,
      Pending: b.pending
    }));

    const COLORS = ['#EA580C', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Total Branches</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Complaints</p>
            <p className="text-2xl font-bold">{data.reduce((s, b) => s + b.total, 0)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Resolved</p>
            <p className="text-2xl font-bold">{data.reduce((s, b) => s + b.resolved, 0)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Avg Resolution Rate</p>
            <p className="text-2xl font-bold">
              {data.length > 0 
                ? (data.reduce((s, b) => s + parseFloat(b.resolutionRate), 0) / data.length).toFixed(1)
                : '0'}%
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Branches - Complaint Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Total" fill="#EA580C" />
              <Bar dataKey="Resolved" fill="#10B981" />
              <Bar dataKey="Open" fill="#F59E0B" />
              <Bar dataKey="Pending" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Branch</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Open</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pending</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Parking</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Resolved</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Resolution %</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">High</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Medium</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Low</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {data.map((branch, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{branch.branch}</td>
                    <td className="px-4 py-3">{branch.total}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                        {branch.open}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {branch.pending}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {branch.parking}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        {branch.resolved}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{branch.resolutionRate}%</td>
                    <td className="px-4 py-3 text-red-600">{branch.high}</td>
                    <td className="px-4 py-3 text-yellow-600">{branch.medium}</td>
                    <td className="px-4 py-3 text-green-600">{branch.low}</td>
                    <td className="px-4 py-3">{branch.avgResolutionTime}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const ExpenseBranchReport = ({ data }) => {
    const chartData = data.slice(0, 10).map(b => ({
      name: b.branch,
      'Total Expense': b.totalExpense,
      'Paid': b.paid,
      'Pending': b.pending
    }));

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Branches</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Expense</p>
            <p className="text-2xl font-bold">Rs {data.reduce((s, b) => s + b.totalExpense, 0).toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Total Entries</p>
            <p className="text-2xl font-bold">{data.reduce((s, b) => s + b.totalEntries, 0)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Pending Amount</p>
            <p className="text-2xl font-bold">Rs {data.reduce((s, b) => s + b.pending, 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Branches - Expense Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => `Rs ${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Total Expense" fill="#10B981" />
              <Bar dataKey="Paid" fill="#3B82F6" />
              <Bar dataKey="Pending" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Branch</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Entries</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total Expense</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Paid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pending</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Partially Paid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Avg/Entry</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Top Vendor</th>
                </tr>
              </thead>
              <tbody>
                {data.map((branch, idx) => {
                  const topVendor = Object.entries(branch.byVendor)
                    .sort((a, b) => b[1] - a[1])[0];
                  
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{branch.branch}</td>
                      <td className="px-4 py-3">{branch.totalEntries}</td>
                      <td className="px-4 py-3 font-bold text-green-600">
                        Rs {branch.totalExpense.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">Rs {branch.paid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-orange-600">Rs {branch.pending.toLocaleString()}</td>
                      <td className="px-4 py-3">Rs {branch.partiallyPaid.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        Rs {(branch.totalExpense / branch.totalEntries).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {topVendor ? `${topVendor[0]} (Rs ${topVendor[1].toLocaleString()})` : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const ComplaintRCAReport = ({ data }) => {
    const COLORS = ['#EA580C', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    
    const pieData = data.slice(0, 8).map((rca, idx) => ({
      name: rca.rca,
      value: rca.count,
      color: COLORS[idx % COLORS.length]
    }));

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">RCA Categories</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Resolved</p>
            <p className="text-2xl font-bold">{data.reduce((s, r) => s + r.count, 0)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Top RCA</p>
            <p className="text-lg font-bold">{data[0]?.rca || 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Avg Resolution Time</p>
            <p className="text-2xl font-bold">
              {data.length > 0 
                ? (data.reduce((s, r) => s + parseFloat(r.avgResolutionTime), 0) / data.length).toFixed(1)
                : '0'}h
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">RCA Distribution (Top 8)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Root Cause Analysis</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Count</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">% of Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">High Priority</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Medium</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Low</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Avg Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Top Branch</th>
                </tr>
              </thead>
              <tbody>
                {data.map((rca, idx) => {
                  const total = data.reduce((s, r) => s + r.count, 0);
                  const percentage = ((rca.count / total) * 100).toFixed(1);
                  const topBranch = Object.entries(rca.byBranch)
                    .sort((a, b) => b[1] - a[1])[0];
                  
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{rca.rca}</td>
                      <td className="px-4 py-3 font-bold">{rca.count}</td>
                      <td className="px-4 py-3">{percentage}%</td>
                      <td className="px-4 py-3 text-red-600">{rca.byPriority.High}</td>
                      <td className="px-4 py-3 text-yellow-600">{rca.byPriority.Medium}</td>
                      <td className="px-4 py-3 text-green-600">{rca.byPriority.Low}</td>
                      <td className="px-4 py-3">{rca.avgResolutionTime}h</td>
                      <td className="px-4 py-3 text-sm">
                        {topBranch ? `${topBranch[0]} (${topBranch[1]})` : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const ExpenseEquipmentReport = ({ data }) => {
    const chartData = data.slice(0, 10).map(e => ({
      name: e.equipment.length > 20 ? e.equipment.substring(0, 20) + '...' : e.equipment,
      'Total Expense': e.totalExpense
    }));

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Equipment Categories</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Expense</p>
            <p className="text-2xl font-bold">Rs {data.reduce((s, e) => s + e.totalExpense, 0).toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Entries</p>
            <p className="text-2xl font-bold">{data.reduce((s, e) => s + e.count, 0)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Top Category</p>
            <p className="text-sm font-bold">{data[0]?.equipment || 'N/A'}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Equipment Categories - Expense</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => `Rs ${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Total Expense" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Equipment/Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Entries</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total Expense</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">% of Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Avg/Entry</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Top Branch</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Top Vendor</th>
                </tr>
              </thead>
              <tbody>
                {data.map((equip, idx) => {
                  const total = data.reduce((s, e) => s + e.totalExpense, 0);
                  const percentage = ((equip.totalExpense / total) * 100).toFixed(1);
                  const topBranch = Object.entries(equip.byBranch)
                    .sort((a, b) => b[1] - a[1])[0];
                  const topVendor = Object.entries(equip.byVendor)
                    .sort((a, b) => b[1] - a[1])[0];
                  
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{equip.equipment}</td>
                      <td className="px-4 py-3">{equip.count}</td>
                      <td className="px-4 py-3 font-bold text-purple-600">
                        Rs {equip.totalExpense.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{percentage}%</td>
                      <td className="px-4 py-3">
                        Rs {(equip.totalExpense / equip.count).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {topBranch ? `${topBranch[0]} (Rs ${topBranch[1].toLocaleString()})` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {topVendor ? `${topVendor[0]}` : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Advanced Reports & Analytics</h1>
        <p className="text-gray-600">Comprehensive reporting for complaints and expenses</p>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => {
            setSelectedReport('complaint-branch');
            setBranchFilter('all');
            setRcaFilter('all');
            setEquipmentFilter('all');
          }}
          className={`p-4 rounded-lg border-2 transition ${
            selectedReport === 'complaint-branch'
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 hover:border-orange-300'
          }`}
        >
          <FileText className={`w-8 h-8 mb-2 ${selectedReport === 'complaint-branch' ? 'text-orange-600' : 'text-gray-400'}`} />
          <h3 className="font-semibold">Complaint Report</h3>
          <p className="text-sm text-gray-600">Branch Wise</p>
        </button>

        <button
          onClick={() => {
            setSelectedReport('expense-branch');
            setBranchFilter('all');
            setRcaFilter('all');
            setEquipmentFilter('all');
          }}
          className={`p-4 rounded-lg border-2 transition ${
            selectedReport === 'expense-branch'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-300'
          }`}
        >
          <DollarSign className={`w-8 h-8 mb-2 ${selectedReport === 'expense-branch' ? 'text-green-600' : 'text-gray-400'}`} />
          <h3 className="font-semibold">Expense Report</h3>
          <p className="text-sm text-gray-600">Branch Wise</p>
        </button>

        <button
          onClick={() => {
            setSelectedReport('complaint-rca');
            setBranchFilter('all');
            setRcaFilter('all');
            setEquipmentFilter('all');
          }}
          className={`p-4 rounded-lg border-2 transition ${
            selectedReport === 'complaint-rca'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <BarChart3 className={`w-8 h-8 mb-2 ${selectedReport === 'complaint-rca' ? 'text-blue-600' : 'text-gray-400'}`} />
          <h3 className="font-semibold">Complaint Report</h3>
          <p className="text-sm text-gray-600">RCA Wise</p>
        </button>

        <button
          onClick={() => {
            setSelectedReport('expense-equipment');
            setBranchFilter('all');
            setRcaFilter('all');
            setEquipmentFilter('all');
          }}
          className={`p-4 rounded-lg border-2 transition ${
            selectedReport === 'expense-equipment'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <Package className={`w-8 h-8 mb-2 ${selectedReport === 'expense-equipment' ? 'text-purple-600' : 'text-gray-400'}`} />
          <h3 className="font-semibold">Expense Report</h3>
          <p className="text-sm text-gray-600">Equipment Wise</p>
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          
          {/* Branch Filter for Complaint Branch-wise and Expense Branch-wise */}
          {(selectedReport === 'complaint-branch' || selectedReport === 'expense-branch') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="all">All Branches</option>
                {[...new Set(selectedReport === 'complaint-branch' 
                  ? complaints.map(c => c.branch).filter(Boolean)
                  : pettyCashEntries.map(e => e.branch).filter(Boolean)
                )].sort().map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* RCA Filter for Complaint RCA-wise */}
          {selectedReport === 'complaint-rca' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RCA Type</label>
              <select
                value={rcaFilter}
                onChange={(e) => setRcaFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="all">All RCA Types</option>
                {[...new Set(complaints
                  .filter(c => c.rca)
                  .map(c => c.rca)
                )].sort().map(rca => (
                  <option key={rca} value={rca}>{rca}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Equipment Filter for Expense Equipment-wise */}
          {selectedReport === 'expense-equipment' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type</label>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="all">All Equipment</option>
                <option value="Camera">Camera</option>
                <option value="Printer">Printer</option>
                <option value="Computer">Computer</option>
                <option value="Network">Network</option>
                <option value="POS">POS</option>
                <option value="LCD/Monitor">LCD/Monitor</option>
                <option value="Keyboard/Mouse">Keyboard/Mouse</option>
                <option value="Access Control">Access Control</option>
                <option value="Cable/Wiring">Cable/Wiring</option>
                <option value="UPS/Power">UPS/Power</option>
                <option value="Server/NVR">Server/NVR</option>
                <option value="Other Hardware">Other Hardware</option>
                <option value="General/Other">General/Other</option>
              </select>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                switch(selectedReport) {
                  case 'complaint-branch':
                    exportComplaintBranchReport();
                    break;
                  case 'expense-branch':
                    exportExpenseBranchReport();
                    break;
                  case 'complaint-rca':
                    exportComplaintRCAReport();
                    break;
                  case 'expense-equipment':
                    exportExpenseEquipmentReport();
                    break;
                }
              }}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </button>
            <button
              onClick={() => exportToExcel(selectedReport)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Report Display */}
      {renderReport()}
    </div>
  );
};

export default JohnnyReports;
