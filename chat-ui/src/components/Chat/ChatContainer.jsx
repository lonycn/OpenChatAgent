import React, { useState, useEffect } from 'react';
import { ProChat } from '@ant-design/pro-components';
import { Button, Tag } from 'antd'; // Import Button and Tag
import axios from 'axios';
import * as websocketService from '../../services/websocketService';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_CHAT_CORE_API_URL || 'http://localhost:3001/api';

const ChatContainer = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchingAgent, setIsSwitchingAgent] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false); // New state for connecting
  const [currentAgent, setCurrentAgent] = useState('ai');
  const [clientGeneratedUserId, setClientGeneratedUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Define event handlers outside of useEffect so they can be reused by handleNewSession
  const wsEventHandlers = {
    onOpen: (event) => {
      console.log('ChatContainer: WebSocket connected', event);
      setIsConnecting(false);
      setIsConnected(true);
    },
    onMessage: (receivedMessage) => {
      console.log('ChatContainer: WebSocket message received:', receivedMessage);
      setIsLoading(false); // Stop general loading on any message from server related to user's request

      if (receivedMessage.type === 'system' && receivedMessage.status === 'initialized') {
        setSessionId(receivedMessage.sessionId);
        if(receivedMessage.userId !== clientGeneratedUserId) {
          console.warn("User ID mismatch. Client:", clientGeneratedUserId, "Server used/confirmed:", receivedMessage.userId);
        }
        setCurrentAgent(receivedMessage.currentAgent || 'ai');
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: receivedMessage.id || uuidv4(),
            role: 'system',
            content: receivedMessage.message || `Session initialized. Session ID: ${receivedMessage.sessionId}`,
            createTime: receivedMessage.timestamp ? new Date(receivedMessage.timestamp).getTime() : Date.now(),
          },
        ]);
      } else if (receivedMessage.type === 'system_ack' ||
                 (receivedMessage.from === 'system' &&
                  receivedMessage.type !== 'error' &&
                  !(receivedMessage.type === 'system' && receivedMessage.status === 'initialized'))) {
         setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: receivedMessage.id || uuidv4(),
            role: 'system',
            content: receivedMessage.text || receivedMessage.message,
            createTime: receivedMessage.timestamp ? new Date(receivedMessage.timestamp).getTime() : Date.now(),
          },
        ]);
         if (receivedMessage.newAgent) {
          setCurrentAgent(receivedMessage.newAgent);
        }
      } else if (receivedMessage.type === 'error') { // Server explicitly sends an error message
         setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: receivedMessage.id || uuidv4(),
            role: 'system',
            content: `Server Error: ${receivedMessage.message || receivedMessage.text || 'Unknown error from server.'}`,
            createTime: receivedMessage.timestamp ? new Date(receivedMessage.timestamp).getTime() : Date.now(),
          },
        ]);
      } else { // Assume AI/assistant message
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: receivedMessage.id || uuidv4(),
            role: receivedMessage.from === 'ai' || receivedMessage.from === 'assistant' ? 'assistant' : 'system',
            content: receivedMessage.text || receivedMessage.content,
            createTime: receivedMessage.timestamp ? new Date(receivedMessage.timestamp).getTime() : Date.now(),
          },
        ]);
      }
    },
    onClose: (event) => {
      console.log('ChatContainer: WebSocket disconnected', event);
      setIsConnected(false);
      setIsConnecting(false);
    },
    onError: (errorEvent) => {
      console.error('ChatContainer: WebSocket error event:', errorEvent);
      setIsConnected(false);
      setIsConnecting(false);
      setIsLoading(false); // Also stop general loading
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: uuidv4(),
          role: 'system',
          // Error events on WebSocket are often generic; specific error usually comes from server message or HTTP error
          content: 'Connection error. Please check your connection or try refreshing.',
          createTime: Date.now(),
        },
      ]);
    }
  };

  // Effect for WebSocket connection management and userId generation
  useEffect(() => {
    let localUserId = clientGeneratedUserId;
    if (!localUserId) {
      localUserId = uuidv4();
      setClientGeneratedUserId(localUserId);
      console.log('ChatContainer: Generated clientUserId:', localUserId);
    }

    if (localUserId && !isConnected && !isConnecting) {
        console.log('ChatContainer: useEffect initiating WebSocket connection attempt.');
        setIsConnecting(true);
        websocketService.connect(wsEventHandlers);
    }

    return () => {
      // Cleanup on unmount
      // websocketService.disconnect(); // This might be too aggressive if component re-mounts often
                                    // Let's make disconnect explicit via "New Session" or leaving page.
    };
  }, [clientGeneratedUserId]); // Effect runs when clientGeneratedUserId is set.

  // More specific useEffect for component unmount cleanup
  useEffect(() => {
    return () => {
        console.log("ChatContainer: Unmounting. Disconnecting WebSocket.");
        websocketService.disconnect();
    }
  }, []);


  const handleSendMessage = async (text) => {
    if (!text || text.trim() === '') return true; // ProChat expects boolean true for success if no message sent.

    if (!isConnected) {
      console.error('ChatContainer: WebSocket not connected. Cannot send message.');
      setMessages((prevMessages) => [...prevMessages, {
        id: uuidv4(), role: 'system', content: 'Not connected. Please wait or refresh.', createTime: Date.now()
      }]);
      return true; // Or false if you want to indicate failure to ProChat
    }

    setIsLoading(true);

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      createTime: Date.now(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');

    // If it's the first message and session isn't established, send 'init'
    if (!sessionId) {
      console.log('ChatContainer: Sending init message for userId:', clientGeneratedUserId);
      websocketService.sendMessage({
        id: userMessage.id,
        type: 'init',
        payload: {
          userId: clientGeneratedUserId, // Use the generated one
          initialMessage: {
              text: userMessage.content,
              type: 'text',
              originalId: userMessage.id
          }
        },
        timestamp: new Date(userMessage.createTime).toISOString()
      });
    } else {
      // Session already initialized, send regular message
      websocketService.sendMessage({
        id: userMessage.id,
        type: 'text',
        text: userMessage.content,
        timestamp: new Date(userMessage.createTime).toISOString(),
        sessionId: sessionId,
        userId: clientGeneratedUserId // Use the generated one
      });
    }
    return true;
  };

  const handleSwitchAgent = async (targetAgent) => {
    if (!sessionId) {
      console.error('ChatContainer: Session not initialized. Cannot switch agent.');
      setMessages((prevMessages) => [...prevMessages, {
        id: uuidv4(), role: 'system', content: 'Error: Session not initialized. Please send a message first.', createTime: Date.now()
      }]);
      return;
    }
    if (targetAgent === currentAgent) {
      console.log(`ChatContainer: Already with ${targetAgent} agent.`);
      return;
    }

    setIsSwitchingAgent(true);
    try {
      const response = await axios.post(`${API_URL}/sessions/${sessionId}/switch-agent`, {
        agent: targetAgent,
      });

      if (response.data && response.data.success) {
        console.log(`ChatContainer: Agent switch to ${targetAgent} initiated successfully via API.`);
        // The actual currentAgent state update should come from a WebSocket system message
        // For immediate feedback, we can optimistically update, but WS message is source of truth.
        // setCurrentAgent(targetAgent); // Optimistic update (optional, server message is better)
        // A system message about the switch will be (or should be) pushed via WebSocket by the server
        // and handled by the onMessage handler.
      } else {
        throw new Error(response.data.error || 'Failed to switch agent via API.');
      }
    } catch (error) {
      console.error('ChatContainer: Error switching agent:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred while switching agents.';
      setMessages((prevMessages) => [...prevMessages, {
        id: uuidv4(), role: 'system', content: `Error switching agent: ${errorMessage}`, createTime: Date.now()
      }]);
    } finally {
      setIsSwitchingAgent(false);
    }
  };

  const handleNewSession = () => {
    console.log('ChatContainer: Initiating new session...');
    if (isConnected) {
      websocketService.disconnect(); // Disconnect existing WebSocket
    }
    // Reset client-side state
    setSessionId(null);
    setMessages([]);
    setCurrentAgent('ai'); // Reset to default agent
    // isConnected will be set by onOpen/onClose handlers of the new connection
    // No need to explicitly set setIsConnected(false) here as disconnect() should trigger onClose.
    setInputValue('');
    setIsLoading(false);
    setIsSwitchingAgent(false);

    // The useEffect for WebSocket connection will handle reconnecting
    // if its dependencies are set up to do so (e.g. if it depended on userId which doesn't change here).
    // Or, more explicitly, call connect again.
    // The current useEffect for WebSocket connection only runs on mount/unmount due to [].
    // So, we need to explicitly call connect.
    // We need access to the eventHandlers defined in useEffect.
    // For simplicity, let's redefine a minimal connect call here or abstract eventHandlers.
    // For now, let's assume the useEffect's connect logic is what we want.
    // To re-trigger useEffect's connect, we could change a dummy state that useEffect depends on.
    // Or, more directly, call connect here.

    // Let's make connect a bit more robust or re-callable.
    // The current websocketService.connect already checks if socket exists.
    // We need to pass the same eventHandlers.
    // This implies eventHandlers should be defined outside or passed to handleNewSession.
    // isConnected will be set by onOpen/onClose handlers of the new connection via wsEventHandlers
    setInputValue('');
    setIsLoading(false);
    setIsSwitchingAgent(false);

    // Explicitly call connect with the defined handlers
    // This ensures a new connection attempt is made after state reset.
    if (clientGeneratedUserId) { // Ensure userId is available before connecting
        console.log('ChatContainer: handleNewSession explicitly calling websocketService.connect');
        websocketService.connect(wsEventHandlers);
    } else {
        console.warn('ChatContainer: handleNewSession - clientGeneratedUserId not set, connect will be tried in useEffect');
        // If clientGeneratedUserId is not set yet (e.g. if this was called too early),
        // the useEffect will pick it up once setClientGeneratedUserId completes.
    }
    console.log('ChatContainer: Client state reset for new session. Connection attempt initiated.');
  };


  return (
    <div style={{ height: 'calc(100vh - 70px)', width: '100%', maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column'}}>
      <div style={{ padding: '5px', background: '#f0f0f0', borderBottom: '1px solid #ccc', fontSize: '12px', textAlign: 'left' }}>
        <p style={{margin:0}}>Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
        <p style={{margin:0}}>User ID: {clientGeneratedUserId || 'Initializing...'}</p> {/* Updated to clientGeneratedUserId */}
        <p style={{margin:0}}>Session ID: {sessionId || 'Not established'}</p>
        <p style={{margin:0}}>Current Agent: {currentAgent}</p>
      </div>

      <div style={{ padding: '5px', borderBottom: '1px solid #ccc', display: 'flex', gap: '8px' }}>
        {sessionId && currentAgent === 'ai' && (
          <Button onClick={() => handleSwitchAgent('human')} loading={isSwitchingAgent} size="small">
            Switch to Human Agent
          </Button>
        )}
        {sessionId && currentAgent === 'human' && (
          <Button onClick={() => handleSwitchAgent('ai')} loading={isSwitchingAgent} size="small">
            Switch to AI Agent
          </Button>
        )}
        <Button onClick={handleNewSession} size="small" danger={!!sessionId}>
          New Session
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', height: '100%' }}> {/* Ensure this div takes up remaining space and allows ProChat to fill */}
        <ProChat
          messages={messages}
          onSend={handleSendMessage}
          input={inputValue}
          onInputChange={setInputValue}
          loading={isLoading || isSwitchingAgent} // Combine loading states for ProChat
          // ProChat style: By default, ProChat might have its own height.
          // To make it fill the container, you might need to ensure its parent has a defined height
          // and ProChat itself is styled to take up 100% of that height if its default isn't sufficient.
          // The `flex: 1` on the parent div should help.
        />
      </div>
    </div>
  );
};

export default ChatContainer;
