import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ServiceCalendarProps {
  month: string;
  year: string;
  markedDates?: string[];
  onDateClick?: (date: string) => void;
}

export const ServiceCalendar: React.FC<ServiceCalendarProps> = ({
  month,
  year,
  markedDates = [],
  onDateClick,
}) => {
  // Dias da semana abreviados
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Exemplo simples de calendário com dias fixos - em uma implementação real 
  // seria gerado dinamicamente baseado no mês/ano
  const calendarData = [
    ['28', '29', '30', '31', '1', '2', '3'],
    ['4', '5', '6', '7', '8', '9', '10'],
    ['11', '12', '13', '14', '15', '16', '17'],
    ['18', '19', '20', '21', '22', '23', '24'],
    ['25', '26', '27', '28', '29', '30', '1'],
  ];

  const isMarked = (day: string) => markedDates.includes(day);
  const isPrevMonth = (day: string) => parseInt(day) > 20 && parseInt(day) < 32;
  const isNextMonth = (day: string, weekIndex: number) => parseInt(day) < 10 && weekIndex > 2;

  const handleDateClick = (day: string) => {
    if (onDateClick && !isPrevMonth(day)) {
      onDateClick(day);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium">{month} {year}</h4>
        <div className="flex space-x-2">
          <button className="p-1 rounded-full bg-gray-100">
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <button className="p-1 rounded-full bg-gray-100">
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekdays.map((day, index) => (
          <div key={index} className="text-xs text-gray-500">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarData.map((week, weekIndex) => (
          React.Children.toArray(
            week.map((day) => (
              <div 
                className={`py-2 ${
                  isPrevMonth(day) || isNextMonth(day, weekIndex) 
                    ? 'text-gray-400' 
                    : 'text-gray-900'
                } ${
                  isMarked(day) 
                    ? 'font-semibold bg-primary bg-opacity-10 rounded-full' 
                    : ''
                } text-sm cursor-pointer hover:bg-gray-100 rounded-full`}
                onClick={() => handleDateClick(day)}
              >
                {day}
              </div>
            ))
          )
        ))}
      </div>
    </div>
  );
};

export default ServiceCalendar;
