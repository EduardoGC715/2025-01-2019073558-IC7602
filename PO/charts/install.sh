#!/bin/bash
helm upgrade --install namespace namespace
sleep 20
cd ..
helm upgrade --install private private
sleep 60
helm upgrade --install public public