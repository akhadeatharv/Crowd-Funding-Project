import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { FaRegClock, FaUsers, FaCheckCircle } from 'react-icons/fa';

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    description: string;
    current_amount: number;
    goal_amount: number;
    end_date: string;
    backer_count: number;
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const percentFunded = (project.current_amount / project.goal_amount) * 100;
  const daysLeft = differenceInDays(new Date(project.end_date), new Date());
  const isCompleted = project.current_amount >= project.goal_amount;
  
  return (
    <Link
      to={`/project/${project.id}`}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-semibold text-gray-800 line-clamp-2">
            {project.title}
          </h2>
          {isCompleted && (
            <div className="flex items-center text-green-600 ml-2">
              <FaCheckCircle className="mr-1" />
              <span className="text-sm font-medium">Funded</span>
            </div>
          )}
        </div>
        <p className="text-gray-600 mb-4 line-clamp-3">
          {project.description}
        </p>
        
        <div className="space-y-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isCompleted ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, percentFunded)}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                ${project.current_amount.toLocaleString()}
              </p>
              <p className="text-gray-500 text-sm">
                of ${project.goal_amount.toLocaleString()} goal
              </p>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-gray-700'}`}>
                {Math.round(percentFunded)}%
              </p>
              <p className="text-gray-500 text-sm">funded</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="flex items-center text-gray-500">
              <FaUsers className="mr-2" />
              <span>{project.backer_count} backers</span>
            </div>
            <div className="flex items-center text-gray-500">
              <FaRegClock className="mr-2" />
              <span>{Math.max(0, daysLeft)} days left</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}