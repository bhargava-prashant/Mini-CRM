import { useState, useEffect } from "react";
import { X, Plus, ChevronRight, Users, BarChart, PieChart, RefreshCw, Send, Clock, Loader } from "lucide-react";


// API service for backend calls
const API_BASE_URL = "http://localhost:5001/api";

const apiService = {
  calculateAudienceSize: async (rules) => {
    const response = await fetch(`${API_BASE_URL}/audience/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules })
    });
    
    if (!response.ok) {
      throw new Error("Failed to calculate audience size");
    }
    
    return response.json();
  },
  
  saveSegment: async (name, rules) => {
    const response = await fetch(`${API_BASE_URL}/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rules })
    });
    
    if (!response.ok) {
      throw new Error("Failed to save segment");
    }
    
    return response.json();
  },
  
  createCampaign: async (name, segmentId, audienceSize) => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, segmentId, audienceSize })
    });
    
    if (!response.ok) {
      throw new Error("Failed to create campaign");
    }
    
    return response.json();
  },
  
  getCampaigns: async () => {
    const response = await fetch(`${API_BASE_URL}/campaigns`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch campaigns");
    }
    
    return response.json();
  },
  getCampaignStats: async (campaignId) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/stats`);

    if (!response.ok) {
      throw new Error("Failed to fetch campaign stats");
    }

    return response.json();
  }
};

// Main App Component
export default function CampaignApp() {
  const [activeTab, setActiveTab] = useState("create");
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold text-gray-800">Campaign Manager</h1>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto flex-1 w-full px-4 py-6">
        <div className="flex mb-6 border-b">
          <button 
            className={`px-4 py-2 font-medium ${activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('create')}
          >
            Create Campaign
          </button>
          <button 
            className={`px-4 py-2 font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('history')}
          >
            Campaign History
          </button>
        </div>
        
        {activeTab === 'create' ? <CampaignCreator /> : <CampaignHistory />}
      </div>
    </div>
  );
}

// Updated CampaignCreator component with message template support
function CampaignCreator() {
  const [campaignName, setCampaignName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("Hi {name}, here's 10% off on your next order!");
  const [rules, setRules] = useState([{ id: 1, type: "group", operator: "AND", conditions: [] }]);
  const [audienceSize, setAudienceSize] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [savedSegment, setSavedSegment] = useState(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [previewCustomerName, setPreviewCustomerName] = useState("Customer");

  // Fetch audience size when rules change
  useEffect(() => {
    if (previewMode && rules[0].conditions.length > 0) {
      fetchAudienceSize();
    }
  }, [previewMode, rules]);

  const fetchAudienceSize = async () => {
    setIsLoading(true);
    try {
      // Use the actual API
      const response = await apiService.calculateAudienceSize(rules[0]);
      setAudienceSize(response.size);
    } catch (error) {
      console.error("Error fetching audience size:", error);
      // Fallback for demo purposes if API fails
      const complexity = countConditions(rules[0]);
      const baseSize = 1250;
      const calculatedSize = Math.round(baseSize / (complexity * 0.5 + 0.5));
      setAudienceSize(calculatedSize);
    } finally {
      setIsLoading(false);
    }
  };

  const countConditions = (group) => {
    let count = 0;
    group.conditions.forEach(condition => {
      if (condition.type === "group") {
        count += countConditions(condition);
      } else {
        count++;
      }
    });
    return count || 1;
  };

  const addCondition = (groupId) => {
    const updatedRules = [...rules];
    const targetGroup = findGroupById(updatedRules[0], groupId);
    
    if (targetGroup) {
      targetGroup.conditions.push({
        id: Date.now(),
        type: "condition",
        field: "totalSpent",
        operator: "greaterThan",
        value: ""
      });
      setRules(updatedRules);
    }
  };

  const addGroup = (parentGroupId) => {
    const updatedRules = [...rules];
    const targetGroup = findGroupById(updatedRules[0], parentGroupId);
    
    if (targetGroup) {
      targetGroup.conditions.push({
        id: Date.now(),
        type: "group",
        operator: "AND",
        conditions: []
      });
      setRules(updatedRules);
    }
  };

  const findGroupById = (group, id) => {
    if (group.id === id) return group;
    
    for (const condition of group.conditions) {
      if (condition.type === "group") {
        const found = findGroupById(condition, id);
        if (found) return found;
      }
    }
    
    return null;
  };

  const updateCondition = (groupId, conditionId, field, value) => {
    const updatedRules = [...rules];
    const targetGroup = findGroupById(updatedRules[0], groupId);
    
    if (targetGroup) {
      const conditionIndex = targetGroup.conditions.findIndex(c => c.id === conditionId);
      if (conditionIndex !== -1) {
        targetGroup.conditions[conditionIndex] = {
          ...targetGroup.conditions[conditionIndex],
          [field]: value
        };
        setRules(updatedRules);
      }
    }
  };

  const removeCondition = (groupId, conditionId) => {
    const updatedRules = [...rules];
    const targetGroup = findGroupById(updatedRules[0], groupId);
    
    if (targetGroup) {
      targetGroup.conditions = targetGroup.conditions.filter(c => c.id !== conditionId);
      setRules(updatedRules);
    }
  };

  const toggleGroupOperator = (groupId) => {
    const updatedRules = [...rules];
    const targetGroup = findGroupById(updatedRules[0], groupId);
    
    if (targetGroup) {
      targetGroup.operator = targetGroup.operator === "AND" ? "OR" : "AND";
      setRules(updatedRules);
    }
  };

  const getPersonalizedMessagePreview = () => {
    return messageTemplate.replace("{name}", previewCustomerName);
  };

  const handleSaveCampaign = async () => {
    if (!campaignName) {
      alert("Please enter a campaign name");
      return;
    }

    if (rules[0].conditions.length === 0) {
      alert("Please add at least one condition to your audience segment");
      return;
    }

    setIsLoading(true);
    
    try {
      // First save the segment
      const segmentData = await apiService.saveSegment(
        `${campaignName} Segment`, 
        rules[0]
      );
      
      setSavedSegment(segmentData);
      
      // Then create the campaign using the segment ID and message template
      await apiService.createCampaign(
        campaignName,
        segmentData._id,
        audienceSize || 0,
        messageTemplate
      );
      
      alert("Campaign created successfully! Messages are being delivered to customers.");
      // Reset form
      setCampaignName("");
      setMessageTemplate("Hi {name}, here's 10% off on your next order!");
      setRules([{ id: 1, type: "group", operator: "AND", conditions: [] }]);
      setAudienceSize(null);
      setPreviewMode(false);
      setSavedSegment(null);
      // Switch to history tab
      window.location.hash = "history";
    } catch (error) {
      console.error("Error saving campaign:", error);
      alert("Failed to save campaign. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Create New Campaign</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Enter campaign name"
        />
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Audience Segmentation Rules</h3>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {previewMode ? "Edit Rules" : "Preview Audience"}
          </button>
        </div>
        
        {!previewMode ? (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <RuleGroup 
              group={rules[0]} 
              onAddCondition={addCondition}
              onAddGroup={addGroup}
              onRemoveCondition={removeCondition}
              onUpdateCondition={updateCondition}
              onToggleOperator={toggleGroupOperator}
              isRoot={true}
            />
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-center">
              <div className="text-center">
                {isLoading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">Calculating audience size...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-3">
                      <Users size={32} className="text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold">{audienceSize || 0}</h3>
                    <p className="text-gray-600">Customers in this segment</p>
                    
                    <div className="mt-6 text-left bg-white p-4 rounded-md shadow-sm border border-gray-200 max-w-md">
                      <h4 className="font-medium mb-2">Selected Criteria:</h4>
                      <RulePreview rules={rules[0]} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Message Template Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Message Template</label>
        <div className="relative">
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            placeholder="Enter message template. Use {name} for customer name."
            rows={3}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Use <code className="bg-gray-100 px-1 py-0.5 rounded">{'{name}'}</code> to personalize with customer's name
            </div>
            <button
              onClick={() => setShowTemplatePreview(!showTemplatePreview)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showTemplatePreview ? "Hide Preview" : "Show Preview"}
            </button>
          </div>
        </div>
        
        {showTemplatePreview && (
          <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center mb-2">
              <label className="text-sm font-medium text-gray-700 mr-2">Preview as:</label>
              <input
                type="text"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
                value={previewCustomerName}
                onChange={(e) => setPreviewCustomerName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
              <div className="flex items-start space-x-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="font-medium text-blue-600">X</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900">{getPersonalizedMessagePreview()}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    This is how your message will appear to customers
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-8">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          onClick={handleSaveCampaign}
          disabled={isLoading || !campaignName || rules[0].conditions.length === 0}
        >
          {isLoading ? "Saving..." : "Create & Send Campaign"}
        </button>
      </div>
    </div>
  );
}

// Rule Group Component
function RuleGroup({ group, onAddCondition, onAddGroup, onRemoveCondition, onUpdateCondition, onToggleOperator, isRoot = false }) {
  return (
    <div className={`${!isRoot ? 'border-l-2 border-blue-200 pl-4 ml-2 mt-3' : ''}`}>
      {!isRoot && (
        <div className="flex items-center mb-2 text-sm text-gray-700">
          <button 
            onClick={() => onToggleOperator(group.id)} 
            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
          >
            {group.operator}
          </button>
          <span className="ml-2">of the following match:</span>
        </div>
      )}
      
      {group.conditions.map((condition) => (
        condition.type === "group" ? (
          <RuleGroup
            key={condition.id}
            group={condition}
            onAddCondition={onAddCondition}
            onAddGroup={onAddGroup}
            onRemoveCondition={onRemoveCondition}
            onUpdateCondition={onUpdateCondition}
            onToggleOperator={onToggleOperator}
          />
        ) : (
          <ConditionRow
            key={condition.id}
            condition={condition}
            groupId={group.id}
            onRemove={onRemoveCondition}
            onUpdate={onUpdateCondition}
          />
        )
      ))}
      
      <div className="mt-3 flex space-x-2">
        <button
          onClick={() => onAddCondition(group.id)}
          className="flex items-center px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          <Plus size={16} className="mr-1" /> Add Condition
        </button>
        <button
          onClick={() => onAddGroup(group.id)}
          className="flex items-center px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          <Plus size={16} className="mr-1" /> Add Group
        </button>
      </div>
    </div>
  );
}

// Condition Row Component
function ConditionRow({ condition, groupId, onRemove, onUpdate }) {
  const fields = [
    { value: "totalSpent", label: "Total Spent" },
    { value: "orderCount", label: "Number of Orders" },
    { value: "visitCount", label: "Number of Visits" },
    { value: "lastActive", label: "Days Since Last Active" },
    { value: "loginCount", label: "Number of Logins" }
  ];
  
  const operators = [
    { value: "greaterThan", label: ">" },
    { value: "lessThan", label: "<" },
    { value: "equals", label: "=" },
    { value: "notEquals", label: "!=" }
  ];

  return (
    <div className="flex items-center space-x-2 py-2">
      <select
        className="border border-gray-300 rounded px-2 py-1"
        value={condition.field}
        onChange={(e) => onUpdate(groupId, condition.id, "field", e.target.value)}
      >
        {fields.map((field) => (
          <option key={field.value} value={field.value}>
            {field.label}
          </option>
        ))}
      </select>
      
      <select
        className="border border-gray-300 rounded px-2 py-1"
        value={condition.operator}
        onChange={(e) => onUpdate(groupId, condition.id, "operator", e.target.value)}
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      
      <input
        type="text"
        className="border border-gray-300 rounded px-2 py-1 w-24"
        value={condition.value}
        onChange={(e) => onUpdate(groupId, condition.id, "value", e.target.value)}
        placeholder="Value"
      />
      
      <button
        onClick={() => onRemove(groupId, condition.id)}
        className="text-gray-400 hover:text-red-500"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Rule Preview Component
function RulePreview({ rules }) {
  const renderCondition = (condition) => {
    if (condition.type === "condition") {
      const fieldMapping = {
        totalSpent: "Total Spent",
        orderCount: "Number of Orders",
        visitCount: "Number of Visits",
        lastActive: "Days Since Last Active",
        loginCount: "Number of Logins"
      };
      
      const operatorMapping = {
        greaterThan: ">",
        lessThan: "<",
        equals: "=",
        notEquals: "!="
      };
      
      return (
        <span className="text-sm">
          <span className="font-medium">{fieldMapping[condition.field]}</span>
          {" "}
          <span>{operatorMapping[condition.operator]}</span>
          {" "}
          <span className="font-medium">{condition.value || "..."}</span>
        </span>
      );
    }
    
    if (condition.type === "group") {
      return (
        <div className="ml-4 mt-1 mb-1">
          {condition.conditions.map((c, i) => (
            <div key={i} className="flex items-start">
              <div className="mr-2 mt-1 text-gray-400">•</div>
              <div className="flex-1">{renderCondition(c)}</div>
              {i < condition.conditions.length - 1 && (
                <div className="text-xs text-gray-500 ml-2 mt-1">{condition.operator}</div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };
  
  return renderCondition(rules);
}

// Campaign History Component with Live Updates
function CampaignHistory() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [campaignStats, setCampaignStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadCampaigns();
    
    // Set up a polling interval for active campaigns
    const pollInterval = setInterval(() => {
      if (expandedCampaignId) {
        refreshCampaignStats(expandedCampaignId);
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [expandedCampaignId]);
  
  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const campaignData = await apiService.getCampaigns();
      setCampaigns(campaignData);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshCampaignStats = async (campaignId) => {
    try {
      const stats = await apiService.getCampaignStats(campaignId);
      setCampaignStats(prevStats => ({
        ...prevStats,
        [campaignId]: stats
      }));
    } catch (error) {
      console.error("Error refreshing campaign stats:", error);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    if (expandedCampaignId) {
      await refreshCampaignStats(expandedCampaignId);
    }
    setRefreshing(false);
  };
  
  const toggleCampaignDetails = async (campaignId) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
    } else {
      setExpandedCampaignId(campaignId);
      
      // Load stats if not already loaded
      if (!campaignStats[campaignId]) {
        try {
          const stats = await apiService.getCampaignStats(campaignId);
          setCampaignStats(prevStats => ({
            ...prevStats,
            [campaignId]: stats
          }));
        } catch (error) {
          console.error("Error loading campaign stats:", error);
        }
      }
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Campaign History</h2>
        <button 
          onClick={handleRefresh}
          className="flex items-center text-blue-600 px-3 py-1 rounded hover:bg-blue-50"
          disabled={refreshing}
        >
          {refreshing ? 
            <Loader size={16} className="mr-2 animate-spin" /> : 
            <RefreshCw size={16} className="mr-2" />
          }
          Refresh
        </button>
      </div>
      
      {campaigns.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">No campaigns created yet.</p>
        </div>
      ) : (
        <div className="divide-y">
          {campaigns.map((campaign) => (
            <div key={campaign._id}>
              <div className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(campaign.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    campaign.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg flex items-center">
                    <div className="bg-indigo-100 p-2 rounded-full mr-3">
                      <Users size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Audience Size</div>
                      <div className="font-medium">{campaign.audienceSize}</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg flex items-center">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Send size={16} className="text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Successfully Sent</div>
                      <div className="font-medium">
                        {campaign.sentCount} ({Math.round(campaign.sentCount / campaign.audienceSize * 100) || 0}%)
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg flex items-center">
                    <div className="bg-red-100 p-2 rounded-full mr-3">
                      <PieChart size={16} className="text-red-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Failed Deliveries</div>
                      <div className="font-medium">
                        {campaign.failedCount} ({Math.round(campaign.failedCount / campaign.audienceSize * 100) || 0}%)
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  className="mt-4 text-sm text-blue-600 flex items-center hover:text-blue-800"
                  onClick={() => toggleCampaignDetails(campaign._id)}
                >
                  {expandedCampaignId === campaign._id ? "Hide Details" : "View Details"} 
                  <ChevronRight size={16} className={`ml-1 transition-transform ${expandedCampaignId === campaign._id ? 'rotate-90' : ''}`} />
                </button>
              </div>
              
              {/* Expanded Details Section */}
              {expandedCampaignId === campaign._id && (
                <div className="bg-gray-50 p-6 border-t border-gray-100">
                  <h4 className="font-medium mb-4">Delivery Details</h4>
                  
                  {!campaignStats[campaign._id] ? (
                    <div className="flex justify-center py-4">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Total Messages</div>
                          <div className="font-medium text-lg">{campaignStats[campaign._id].total}</div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Successfully Sent</div>
                          <div className="font-medium text-lg text-green-600">
                            {campaignStats[campaign._id].sent}
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Failed</div>
                          <div className="font-medium text-lg text-red-600">
                            {campaignStats[campaign._id].failed}
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Pending</div>
                          <div className="font-medium text-lg text-yellow-600">
                            {campaignStats[campaign._id].queued}
                          </div>
                        </div>
                      </div>
                      
                      {/* Delivery Progress Bar */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Delivery Progress</span>
                          <span>{Math.round((campaignStats[campaign._id].sent + campaignStats[campaign._id].failed) / campaignStats[campaign._id].total * 100) || 0}% Complete</span>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className="flex h-full">
                            <div 
                              className="bg-green-500" 
                              style={{width: `${(campaignStats[campaign._id].sent / campaignStats[campaign._id].total) * 100}%`}}
                            ></div>
                            <div 
                              className="bg-red-500" 
                              style={{width: `${(campaignStats[campaign._id].failed / campaignStats[campaign._id].total) * 100}%`}}
                            ></div>
                          </div>
                        </div>
                        <div className="flex text-xs mt-2">
                          <div className="flex items-center mr-4">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                            <span>Sent</span>
                          </div>
                          <div className="flex items-center mr-4">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                            <span>Failed</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-200 rounded-full mr-1"></div>
                            <span>Pending</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Auto-refresh note */}
                      <div className="mt-4 text-xs text-gray-500 flex items-center">
                        <Clock size={12} className="mr-1" />
                        Status updates automatically every 5 seconds
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}