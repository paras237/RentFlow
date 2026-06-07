package com.rentalmanagement.rentalservice.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    /**
     * Forward the root URL to the static SPA (index.html).
     * Spring Boot serves static files from /static/ automatically.
     * By forwarding "forward:/index.html" we let Spring MVC
     * serve the SPA without losing the path.
     */
    @GetMapping("/")
    public String home() {
        return "forward:/index.html";
    }
}
