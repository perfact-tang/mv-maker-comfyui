import React, { useCallback, useState } from 'react';
import { Upload, FileJson, AlertCircle } from 'lucide-react';
import { parseMVData } from '../utils/dataParser';
import { MVScriptData } from '../types/mv-data';

interface FileUploaderProps {
  onDataLoaded: (data: MVScriptData) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('请上传有效的 JSON 文件');
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = await parseMVData(text);
        onDataLoaded(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('读取文件失败');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div 
        className={`
          w-full max-w-xl p-10 rounded-2xl glass-card border-2 transition-all duration-300
          flex flex-col items-center justify-center gap-6 cursor-pointer
          ${isDragging 
            ? 'border-neon-cyan bg-cyan-900/10 scale-105' 
            : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input 
          type="file" 
          id="file-input"
          className="hidden" 
          accept=".json"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        
        <div className={`
          p-6 rounded-full bg-black/30 border transition-all duration-300
          ${isDragging ? 'border-neon-cyan text-neon-cyan' : 'border-white/10 text-gray-400'}
        `}>
          {loading ? (
            <div className="w-10 h-10 border-2 border-t-transparent border-neon-cyan rounded-full animate-spin" />
          ) : (
            <Upload size={40} />
          )}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">
            {loading ? '处理中...' : '上传分镜脚本 JSON'}
          </h3>
          <p className="text-sm text-gray-400">
            拖拽您的 <span className="text-neon-cyan font-mono">json文件</span> 到此处
            <br /> 或点击浏览
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-gray-600">
        <FileJson size={14} />
        <span>支持格式: JSON Schema v1.0</span>
      </div>
    </div>
  );
};
