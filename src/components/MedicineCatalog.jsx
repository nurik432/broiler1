// src/components/MedicineCatalog.jsx

import { useState, useEffect } from 'react'; // <--- ОШИБКА ИСПРАВЛЕНА ЗДЕСЬ
import { supabase } from '../supabaseClient';

function MedicineCatalog() {
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); // Состояние для первоначальной загрузки

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    setFetching(true);
    const { data, error } = await supabase.from('medicines').select('*').order('name');
    if (error) {
      console.error('Ошибка при загрузке лекарств:', error);
      alert('Не удалось загрузить каталог лекарств.');
    } else {
      setMedicines(data);
    }
    setFetching(false);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleDelete = async (medId, imageUrl) => {
    const confirmed = window.confirm("Вы уверены, что хотите удалить это лекарство?");
    if (!confirmed) return;

    try {
      // 1. Удаляем запись из таблицы
      const { error: dbError } = await supabase.from('medicines').delete().eq('id', medId);
      if (dbError) throw dbError;

      // 2. Если есть изображение, удаляем его из хранилища
      if (imageUrl) {
        const filePath = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
        if (filePath) {
           const { error: storageError } = await supabase.storage.from('medicine_images').remove([filePath]);
           if (storageError) console.error("Не удалось удалить старый файл, но запись из БД удалена:", storageError);
        }
      }

      // 3. Обновляем список, убирая удаленный элемент
      setMedicines(medicines.filter(med => med.id !== medId));

    } catch (error) {
      alert("Ошибка при удалении: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);

    let imageUrl = null;
    let imageFileName = null;

    if (imageFile) {
      imageFileName = `${Date.now()}_${imageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('medicine_images')
        .upload(imageFileName, imageFile);

      if (uploadError) {
        alert('Ошибка загрузки изображения: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from('medicine_images')
        .getPublicUrl(imageFileName);
      imageUrl = data.publicUrl;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase
      .from('medicines')
      .insert([{ name, description, image_url: imageUrl, user_id: user.id }]);

    if (insertError) {
      alert('Ошибка добавления лекарства: ' + insertError.message);
    } else {
      setName('');
      setDescription('');
      setImageFile(null);
      e.target.reset();
      await fetchMedicines();
    }
    setLoading(false);
  };

  return (
    <div className="mt-10">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Каталог лекарств</h2>

      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-2xl font-semibold mb-4 text-gray-700">Добавить новое лекарство</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ... код полей формы остается без изменений ... */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Название</label>
            <input id="name" type="text" placeholder="Название лекарства" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Описание</label>
            <textarea id="description" placeholder="Краткое описание" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">Изображение</label>
            <input id="image" type="file" accept="image/*" onChange={handleImageChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
          </div>
          <button type="submit" disabled={loading} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
            {loading ? 'Загрузка...' : 'Добавить лекарство'}
          </button>
        </form>
      </div>

      <hr className="my-8" />

      {/* УЛУЧШЕННЫЙ БЛОК ОТОБРАЖЕНИЯ СПИСКА */}
      {fetching ? (
        <p className="text-center text-gray-500">Загрузка каталога...</p>
      ) : medicines.length === 0 ? (
        <p className="text-center text-gray-500">В вашем каталоге пока нет лекарств. Добавьте первое!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {medicines.map((med) => (
            <div key={med.id} className="group bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300 relative">
              <button onClick={() => handleDelete(med.id, med.image_url)} className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Удалить">
                &#x2715;
              </button>
              <img src={med.image_url || 'https://via.placeholder.com/300x200?text=No+Image'} alt={med.name} className="w-full h-40 object-cover"/>
              <div className="p-4">
                <h4 className="font-bold text-lg mb-2 text-gray-800">{med.name}</h4>
                <p className="text-gray-600 text-sm">{med.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MedicineCatalog;