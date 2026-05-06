// RN 앱 entry — Supabase JS SDK가 RN에서 동작하려면 url polyfill 먼저 로드.
import "react-native-url-polyfill/auto";

import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
