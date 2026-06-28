// src/pages/DebtsPage.jsx

import DebtTab from './employees/DebtTab';

export default function DebtsPage() {
    return (
        <div className="p-6 min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">💰 Долги цеха</h1>
            <DebtTab />
        </div>
    );
}
