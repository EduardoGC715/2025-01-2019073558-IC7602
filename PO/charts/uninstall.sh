#!/bin/bash
helm uninstall public
sleep 20
helm uninstall private
sleep 60
helm uninstall namespace
