import React from 'react';
import { Card } from './SharedComponents';

export interface StatCardProps {
  title: string;
  value: string | number;
  colorClass: string;
  description: string;
  iconClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, colorClass, description, iconClass }) => (
  <Card className="shadow-lg text-center">
    <div className="flex items-center justify-center mb-1">
      {iconClass && <i className={`h-6 w-6 mr-2 ${iconClass}`}></i>}
      <h3 className="text-lg font-semibold text-gray-700">{title.toLocaleUpperCase()}</h3>
    </div>
    <p className={`text-4xl font-bold my-2 ${colorClass}`}>{value}</p>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
  </Card>
);

export default StatCard;
