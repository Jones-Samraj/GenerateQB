import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import { encryptTransform } from 'redux-persist-transform-encrypt';

// It's highly recommended to store your secret key in an environment variable
const secretKey = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_REDUX_SECRET_KEY)
  ? process.env.REACT_APP_REDUX_SECRET_KEY
  : 'my-super-secret-key-for-dev';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user'], 
  transforms: [
    encryptTransform({
      secretKey: secretKey,
      onError: function (error) {
        // Handle the error.
        console.error('redux-persist-transform-encrypt error:', error);
      },
    }),
  ],
};

const persistedReducer = persistReducer(persistConfig, userReducer);

const store = configureStore({
  reducer: {
    user: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
export default store;
