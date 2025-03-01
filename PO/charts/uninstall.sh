#!/bin/bash
helm uninstall public
sleep 20
helm uninstall private
sleep 10
helm uninstall namespace
