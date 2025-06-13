import React from 'react';

const TestResetPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Página de Teste</h1>
        <p className="text-gray-600 text-center mt-4">
          Esta é uma página de teste para verificar o roteamento.
        </p>
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <p className="text-green-700 text-sm">
            URL atual: {window.location.href}
          </p>
          <p className="text-green-700 text-sm mt-2">
            Query params: {window.location.search}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestResetPage;