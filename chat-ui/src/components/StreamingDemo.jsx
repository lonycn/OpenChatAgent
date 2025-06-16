import React, { useState } from 'react';
import StreamingMessage from './StreamingMessage';
import TypeItStreamingMessage from './TypeItStreamingMessage';

const StreamingDemo = () => {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [isComplete1, setIsComplete1] = useState(false);
  const [isComplete2, setIsComplete2] = useState(false);

  const fullText = '"鹅鹅鹅"出自唐代诗人骆宾王的《咏鹅》。全诗如下：\n\n鹅，鹅，鹅，\n曲项向天歌。\n白毛浮绿水，\n红掌拨清波。\n\n这首诗描绘了一幅生动的鹅在水中游动的画面，通过简单的语言表达了鹅的姿态与美丽。';

  const simulateStreaming = (setText, setIsComplete) => {
    setText('');
    setIsComplete(false);
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setText(fullText.substring(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  };

  const startDemo1 = () => {
    simulateStreaming(setText1, setIsComplete1);
  };

  const startDemo2 = () => {
    simulateStreaming(setText2, setIsComplete2);
  };

  const resetDemo = () => {
    setText1('');
    setText2('');
    setIsComplete1(false);
    setIsComplete2(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>流式文本组件演示</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={startDemo1} style={{ marginRight: '10px' }}>
          开始演示 - 自定义组件
        </button>
        <button onClick={startDemo2} style={{ marginRight: '10px' }}>
          开始演示 - TypeIt组件
        </button>
        <button onClick={resetDemo}>
          重置
        </button>
      </div>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h3>自定义流式组件：</h3>
        <div style={{ 
          minHeight: '100px', 
          padding: '10px', 
          backgroundColor: 'white', 
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <StreamingMessage 
            text={text1} 
            isComplete={isComplete1} 
            speed={30}
          />
        </div>
      </div>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h3>TypeIt流式组件：</h3>
        <div style={{ 
          minHeight: '100px', 
          padding: '10px', 
          backgroundColor: 'white', 
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <TypeItStreamingMessage 
            text={text2} 
            isComplete={isComplete2} 
            speed={50}
            showCursor={true}
          />
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h4>使用说明：</h4>
        <ul>
          <li>自定义组件：轻量级，适合简单的流式文本显示</li>
          <li>TypeIt组件：功能更强大，支持更多动画效果</li>
          <li>两个组件都支持实时流式更新</li>
          <li>可以根据项目需求选择合适的组件</li>
        </ul>
      </div>
    </div>
  );
};

export default StreamingDemo; 