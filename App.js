import React, { Component } from "react";
import BottomTabNavigator from "./components/BottomTabNavigator";
import { Rajdhani_600SemiBold } from "@expo-google-fonts/rajdhani";
import * as Font from "expo-font";
import { createSwitchNavigator, createAppContainer } from "react-navigation";
import LoginScreen from "./screens/Login";

export default class App extends Component {
  constructor(){
    super();
    this.state = {
      fontLoaded: false
    };
  }

  async loadfonts(){
    await Font.loadAsync({
      Rajdhani_600SemiBold: Rajdhani_600SemiBold
    });
    this.setState({fontLoaded: true})
  }

  componentDidMount(){
    this.loadfonts();
  }

  render() {
    const { fontLoaded } = this.state;
    if(fontLoaded){
    return <AppContainer/>;
    }
    return null;
  }
}

const AppSwitchNavigator = createSwitchNavigator(
  {
    Login: {
      screen: LoginScreen
    },
    BottomTab: {
      screen: BottomTabNavigator
    },
  },
  {
    initialRouteName: "Login"
  }
);

const AppContainer = createAppContainer(AppSwitchNavigator);