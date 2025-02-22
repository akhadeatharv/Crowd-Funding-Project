import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { FaRegClock, FaUsers, FaDollarSign, FaChartLine, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Project {
  id: string;
  title: string;
  description: string;
  current_amount: number;
  goal_amount: number;
  end_date: string;
  backer_count: number;
  created_at: string;
  user_id: string;
  updates: Update[];
  pledges: Pledge[];
}

interface Update {
  id: string;
  content: string;
  created_at: string;
}

interface Pledge {
  amount: number;
  created_at: string;
}

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pledgeAmount, setPledgeAmount] = React.useState('');
  const [pledgeLoading, setPledgeLoading] = React.useState(false);
  const [updateContent, setUpdateContent] = React.useState('');
  const [showUpdateForm, setShowUpdateForm] = React.useState(false);

  React.useEffect(() => {
    async function fetchProject() {
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;

        const { data: updatesData, error: updatesError } = await supabase
          .from('updates')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false });

        if (updatesError) throw updatesError;

        const { data: pledgesData, error: pledgesError } = await supabase
          .from('pledges')
          .select('amount, created_at')
          .eq('project_id', id)
          .order('created_at', { ascending: true });

        if (pledgesError) throw pledgesError;

        setProject({
          ...projectData,
          updates: updatesData || [],
          pledges: pledgesData || []
        });
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project details');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProject();
    }
  }, [id]);

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setPledgeLoading(true);
    setError(null);

    try {
      if (!user) {
        navigate('/signin', { state: { returnTo: `/project/${id}` } });
        return;
      }

      if (!project) {
        throw new Error('Project not found');
      }

      const amount = parseFloat(pledgeAmount);
      const remainingAmount = project.goal_amount - project.current_amount;

      if (amount > remainingAmount) {
        setError(`The maximum pledge amount available is $${remainingAmount.toFixed(2)}`);
        setPledgeLoading(false);
        return;
      }

      const { error: pledgeError } = await supabase
        .from('pledges')
        .insert([{
          amount,
          project_id: id,
          user_id: user.id
        }]);

      if (pledgeError) throw pledgeError;

      toast.success('Thank you for your pledge!');
      setPledgeAmount('');
      
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      const { data: updatesData } = await supabase
        .from('updates')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      const { data: pledgesData } = await supabase
        .from('pledges')
        .select('amount, created_at')
        .eq('project_id', id)
        .order('created_at', { ascending: true });

      setProject({
        ...projectData,
        updates: updatesData || [],
        pledges: pledgesData || []
      });
    } catch (err) {
      console.error('Error making pledge:', err);
      toast.error('Failed to process pledge. Please try again.');
    } finally {
      setPledgeLoading(false);
    }
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !project || user.id !== project.user_id) return;

    try {
      const { error } = await supabase
        .from('updates')
        .insert([{
          content: updateContent,
          project_id: id,
          user_id: user.id
        }]);

      if (error) throw error;

      toast.success('Update posted successfully');
      setUpdateContent('');
      setShowUpdateForm(false);

      const { data: updatesData } = await supabase
        .from('updates')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      setProject(prev => prev ? {
        ...prev,
        updates: updatesData || []
      } : null);
    } catch (err) {
      console.error('Error posting update:', err);
      toast.error('Failed to post update. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Project not found</p>
      </div>
    );
  }

  const daysLeft = Math.max(0, differenceInDays(new Date(project.end_date), new Date()));
  const percentFunded = (project.current_amount / project.goal_amount) * 100;
  const isCompleted = project.current_amount >= project.goal_amount;
  const remainingAmount = project.goal_amount - project.current_amount;

  const chartData = project.pledges
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .reduce((acc: any[], pledge) => {
      const date = format(new Date(pledge.created_at), 'MMM d');
      const last = acc[acc.length - 1];
      const amount = last ? last.total + pledge.amount : pledge.amount;
      return [...acc, { date, total: amount }];
    }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <FaArrowLeft className="mr-2" />
          Back to Projects
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">{project.title}</h1>
        {isCompleted && (
          <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-full">
            <FaCheckCircle className="mr-2" />
            <span className="font-medium">Project Successfully Funded!</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className={`flex items-center mb-2 ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
            <FaDollarSign className="mr-2" />
            <span className="text-2xl font-bold">
              ${project.current_amount.toLocaleString()}
            </span>
          </div>
          <p className="text-gray-500">of ${project.goal_amount.toLocaleString()} goal</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center text-green-600 mb-2">
            <FaUsers className="mr-2" />
            <span className="text-2xl font-bold">{project.backer_count}</span>
          </div>
          <p className="text-gray-500">total backers</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center text-orange-600 mb-2">
            <FaRegClock className="mr-2" />
            <span className="text-2xl font-bold">{daysLeft}</span>
          </div>
          <p className="text-gray-500">days to go</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isCompleted ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(100, percentFunded)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span className={isCompleted ? 'text-green-600 font-medium' : ''}>
            {Math.round(percentFunded)}% funded
          </span>
          <span>{daysLeft} days left</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FaChartLine className="mr-2" />
          Funding Progress
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#2563eb"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">About this project</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Project Updates</h2>
          {user && user.id === project.user_id && (
            <button
              onClick={() => setShowUpdateForm(!showUpdateForm)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showUpdateForm ? 'Cancel' : 'Post Update'}
            </button>
          )}
        </div>

        {showUpdateForm && (
          <form onSubmit={handleAddUpdate} className="mb-6">
            <textarea
              value={updateContent}
              onChange={(e) => setUpdateContent(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-2"
              rows={4}
              placeholder="Share your progress..."
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Post Update
            </button>
          </form>
        )}

        <div className="space-y-4">
          {project.updates && project.updates.length > 0 ? (
            project.updates
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((update) => (
                <div key={update.id} className="border-l-4 border-blue-500 pl-4">
                  <p className="text-gray-700 mb-2">{update.content}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(update.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              ))
          ) : (
            <p className="text-gray-500">No updates yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Support this project</h2>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {isCompleted ? (
          <div className="text-center py-6">
            <FaCheckCircle className="text-green-600 text-4xl mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-2">
              This project has been successfully funded!
            </p>
            <p className="text-gray-600">
              Thank you to all {project.backer_count} backers who made this possible.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePledge} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pledge Amount ($)
              </label>
              <div className="mt-1 relative">
                <input
                  type="number"
                  min="1"
                  max={remainingAmount}
                  step="0.01"
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={pledgeAmount}
                  onChange={(e) => setPledgeAmount(e.target.value)}
                />
                <div className="mt-1 text-sm text-gray-500">
                  Maximum available pledge: ${remainingAmount.toFixed(2)}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={pledgeLoading || parseFloat(pledgeAmount) > remainingAmount}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pledgeLoading ? 'Processing...' : 'Back this project'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}