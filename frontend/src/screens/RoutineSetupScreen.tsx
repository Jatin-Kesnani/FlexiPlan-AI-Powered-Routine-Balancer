import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RoutineSetupScreen = ({ navigation }: any) => {
    const [messages, setMessages] = useState([
        { id: '1', sender: 'assistant', text: 'Welcome to Flexiplan! Let’s set up your routine. What time do you usually wake up on a day?' },
    ]);
    const [input, setInput] = useState('');
    const [currentQuestionId, setCurrentQuestionId] = useState(1);
    const [userId, setUserId] = useState(4); 
    const [token, setToken] = useState<string | null>(null); 

    useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem('access_token');
            setToken(storedToken);
        };
        fetchToken();
    }, []);

    
    const handleSendMessage = async () => {
        if (input.trim()) {
            const newMessage = { id: Date.now().toString(), sender: 'user', text: input };
            setMessages([...messages, newMessage]);
            setInput('');

            if (!token) {
                Alert.alert('Error', 'No token found, please log in again');
                return;
            }

            try {
                const response = await fetch('http://172.16.82.225:8000/api/routine-setup/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        question_id: currentQuestionId,
                        response: input,
                    }),
                });

                const data = await response.json();

                if (data.clarification) {
                    const assistantMessage = { id: Date.now().toString(), sender: 'assistant', text: data.clarification };
                    setMessages((prev) => [...prev, assistantMessage]);
                } else if (data.next_question) {
                    const assistantMessage = { id: Date.now().toString(), sender: 'assistant', text: data.next_question.question };
                    setMessages((prev) => [...prev, assistantMessage]);
                    setCurrentQuestionId(data.next_question.id); 
                } else {
                    const assistantMessage = { id: Date.now().toString(), sender: 'assistant', text: data.message || "Routine setup complete!" };
                    setMessages((prev) => [...prev, assistantMessage]);
                    navigation.replace("TabNavigator");
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to communicate with the server.');
            }
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <Text style={[styles.message, item.sender === 'assistant' ? styles.assistant : styles.user]}>
                        {item.text}
                    </Text>
                )}
                contentContainerStyle={styles.chat}
            />
            <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Type your message..."
            />
            <Button title="Send" onPress={handleSendMessage} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    chat: { paddingBottom: 16 },
    message: { marginVertical: 8, padding: 10, borderRadius: 8 },
    assistant: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' },
    user: { backgroundColor: '#007bff', color: '#fff', alignSelf: 'flex-end' },
    input: { borderWidth: 1, borderColor: 'gray', padding: 8, marginVertical: 8, borderRadius: 4 },
});

export default RoutineSetupScreen;
